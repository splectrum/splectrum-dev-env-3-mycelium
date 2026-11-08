// A topic in Kafka's sense, single partition, on a storage (notes/topics.md).
//   const t = await openTopic({ storage, roll: { records, ms } })
//   await t.produce({ value, headers })      → its offset
//   await t.consume(offset)                  → records from offset: [{ offset, value, headers? }]
//   const stop = t.follow(offset, records => ...)
//   await t.fold((state, record) => state, initial, { to })
//   await t.roll()                           close the active segment now
//   await t.verify()                         the chain of sealed segments
//   await t.retain({ segments })             keep the last n archived segments
//   t.endOffset()                            the next offset to be assigned
//
// Layout, in Kafka's terms: the partition `partition-0/`; its segments
// named by base offset (20 digits). The active segment is a directory, one
// object per record, named by its offset (`<offset>.json`, a record
// `{ value, headers? }`; the offset is the name, never written). A closed
// segment is archived (our addition): replaced by one object holding its
// records in order, `<base>.json`, a JSON array. Sealing (our addition):
// an archived segment's hash goes in a header of the next segment's first
// record (`previousSegment`: `<base>:<sha256>`), so the segments form a
// chain.
//
// One producer per partition. Producing rolls the active segment when the
// policy says so (records per segment, or its age); a restart is no
// boundary: on opening, the producer finds the active segment and the end
// offset. Reading never needs to know which segments are archived.

import { createHash } from 'bare-crypto'
import { parseRecords, encodeJson } from './format.js'

const PARTITION = 'partition-0'
const pad = n => String(n).padStart(20, '0')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

export async function openTopic ({ storage, roll = {}, now = () => Date.now() }) {
  const policy = { records: roll.records ?? 1000, ms: roll.ms ?? null }

  // The segments, in order: { base, archived }
  async function segments () {
    const seen = new Map()
    for (const name of await storage.list(PARTITION)) {
      const m = name.match(/^(\d{20})(\.json)?$/)
      if (!m) continue
      const base = Number(m[1])
      const archived = Boolean(m[2])
      // An archive written but its directory not yet removed: the archive wins.
      if (archived || !seen.has(base)) seen.set(base, { base, archived })
    }
    const list = [...seen.values()].sort((a, b) => a.base - b.base)
    for (const s of list) {
      if (s.archived && (await storage.isDirectory(`${PARTITION}/${pad(s.base)}`))) await storage.remove(`${PARTITION}/${pad(s.base)}`)
    }
    return list
  }

  async function recordsOf (seg) {
    if (seg.archived) {
      const bytes = await storage.read(`${PARTITION}/${pad(seg.base)}.json`)
      return parseRecords('a.json', bytes).map((r, i) => ({ offset: seg.base + i, ...r }))
    }
    const out = []
    for (const name of await storage.list(`${PARTITION}/${pad(seg.base)}`)) {
      const m = name.match(/^(\d{20})\.json$/)
      if (!m) continue
      const [r] = parseRecords(name, await storage.read(`${PARTITION}/${pad(seg.base)}/${name}`))
      out.push({ offset: Number(m[1]), ...r })
    }
    return out.sort((a, b) => a.offset - b.offset)
  }

  // State of the producer, found on opening.
  let segs = await segments()
  let active = null // { base, count, started }
  let end = 0
  let seal = null // the last archived segment's { base, hash }, to carry forward
  const last = segs[segs.length - 1]
  if (last && !last.archived) {
    const rs = await recordsOf(last)
    active = { base: last.base, count: rs.length, started: now() }
    end = last.base + rs.length
  } else if (last && last.archived) {
    const bytes = await storage.read(`${PARTITION}/${pad(last.base)}.json`)
    end = last.base + parseRecords('a.json', bytes).length
    seal = { base: last.base, hash: sha256(bytes) }
  }

  async function archive (seg) {
    const rs = (await recordsOf(seg)).map(({ offset, ...r }) => r)
    const bytes = Buffer.from(JSON.stringify(rs) + '\n')
    await storage.write(`${PARTITION}/${pad(seg.base)}.json`, bytes)
    await storage.remove(`${PARTITION}/${pad(seg.base)}`)
    return { base: seg.base, hash: sha256(bytes) }
  }

  async function rollActive () {
    if (!active || active.count === 0) return null
    seal = await archive(active)
    active = null
    return seal
  }

  let queue = Promise.resolve()
  function produce ({ value, headers }) {
    const run = queue.then(async () => {
      if (active && (active.count >= policy.records || (policy.ms !== null && now() - active.started >= policy.ms))) await rollActive()
      const offset = end
      const record = { value }
      const hs = [...(headers || [])]
      if (!active) {
        active = { base: offset, count: 0, started: now() }
        if (seal) hs.push({ key: 'previousSegment', value: `${pad(seal.base)}:${seal.hash}` })
      }
      if (hs.length) record.headers = hs
      await storage.write(`${PARTITION}/${pad(active.base)}/${pad(offset)}.json`, encodeJson(record))
      active.count++
      end = offset + 1
      return offset
    })
    queue = run.catch(() => {})
    return run
  }

  async function consume (from = 0) {
    const out = []
    segs = await segments()
    for (let i = 0; i < segs.length; i++) {
      const next = segs[i + 1]
      if (next && next.base <= from) continue
      for (const r of await recordsOf(segs[i])) if (r.offset >= from) out.push(r)
    }
    return out
  }

  function follow (from, onRecords, { every = 200 } = {}) {
    let at = from
    let stopped = false
    let timer = null
    const tick = async () => {
      if (stopped) return
      try {
        const rs = await consume(at)
        if (rs.length) { at = rs[rs.length - 1].offset + 1; await onRecords(rs) }
      } finally {
        if (!stopped) timer = setTimeout(tick, every)
      }
    }
    tick()
    return () => { stopped = true; clearTimeout(timer) }
  }

  async function fold (reducer, initial, { to = Infinity } = {}) {
    let state = initial
    for (const r of await consume(0)) {
      if (r.offset > to) break
      state = reducer(state, r)
    }
    return state
  }

  async function verify () {
    segs = await segments()
    const problems = []
    for (let i = 0; i < segs.length - 1; i++) {
      if (!segs[i].archived) { problems.push(`segment ${segs[i].base} is not archived`); continue }
      const hash = sha256(await storage.read(`${PARTITION}/${pad(segs[i].base)}.json`))
      const [first] = await recordsOf(segs[i + 1])
      const h = (first?.headers || []).find(x => x.key === 'previousSegment')
      if (!h || h.value !== `${pad(segs[i].base)}:${hash}`) problems.push(`segment ${segs[i + 1].base} does not seal ${segs[i].base}`)
    }
    return { segments: segs.length, archived: segs.filter(s => s.archived).length, ok: problems.length === 0, problems }
  }

  // Retention: keep the last n archived segments (the active one always).
  async function retain ({ segments: keep }) {
    segs = await segments()
    const archived = segs.filter(s => s.archived)
    const drop = archived.slice(0, Math.max(0, archived.length - keep))
    for (const s of drop) await storage.remove(`${PARTITION}/${pad(s.base)}.json`)
    return drop.map(s => s.base)
  }

  return { produce, consume, follow, fold, roll: () => (queue = queue.then(rollActive)), verify, retain, endOffset: () => end }
}

// A consumer's committed offset, as in Kafka: produced into a topic of its
// own, so a consumer resumes where it was.
export async function committedOffsets ({ storage }) {
  const t = await openTopic({ storage })
  return {
    commit: offset => t.produce({ value: { offset } }),
    committed: async () => t.fold((at, r) => r.value.offset, null)
  }
}

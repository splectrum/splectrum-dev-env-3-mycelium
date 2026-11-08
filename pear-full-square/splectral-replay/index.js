// splectral-replay — a generic source kind: the topics of another source,
// consumed from offset 0 and played back in time order at a chosen speed.
//   { kind: 'replay', sources: [<source config>, ...], speed: 10, maxGap: 2000 }
// It knows nothing of what the topics hold: each record goes through the
// same mapper as when live.

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default async function replay (cfg, platform) {
  const topics = (cfg.sources || []).flatMap(s => platform.topicsOf(s))
  const all = []
  for (const topic of topics) for (const record of await platform.readAll(topic)) all.push({ topic, record })
  // Time order across topics; within a topic, offset order (stable sort).
  // At the same millisecond a scenario's own record (its message) comes
  // first: it announces what follows (a step's say, then its action's effect).
  const told = x => (x.topic.holds === 'splectral/world' ? 0 : 1)
  all.sort((a, b) => ((a.record.value?.time ?? 0) - (b.record.value?.time ?? 0)) || (told(a) - told(b)))
  const speed = cfg.speed ?? 10
  const maxGap = cfg.maxGap ?? 2000
  let stopped = false
  const done = (async () => {
    let last = null
    for (const { topic, record } of all) {
      if (stopped) return
      const t = record.value?.time
      if (last !== null && t) await sleep(Math.min(maxGap, Math.max(0, (t - last) / speed)))
      if (t) last = t
      platform.mapRecord(topic, record)
    }
    platform.emit({ kind: 'say', text: `Replay finished: ${all.length} records from ${topics.length} topics.`, replay: true })
  })()
  return { stop: () => { stopped = true }, done, records: all.length }
}

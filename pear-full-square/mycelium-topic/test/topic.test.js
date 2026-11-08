import test from 'brittle'
import { mkdtempSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openTopic, committedOffsets, folderStorage, parseRecords } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'topic-'))
const pad = n => String(n).padStart(20, '0')

test('produce and consume: offsets from 0 in order, the data in value', async (t) => {
  const root = dir()
  const tp = await openTopic({ storage: folderStorage(root) })
  t.is(await tp.produce({ value: { kind: 'a' } }), 0)
  t.is(await tp.produce({ value: { kind: 'b' }, headers: [{ key: 'origin', value: 'test' }] }), 1)
  const rs = await tp.consume(0)
  t.alike(rs, [{ offset: 0, value: { kind: 'a' } }, { offset: 1, value: { kind: 'b' }, headers: [{ key: 'origin', value: 'test' }] }])
  t.alike((await tp.consume(1)).map(r => r.offset), [1])
  // One object per record in the active segment, named by its offset; the offset is never written.
  const files = readdirSync(join(root, 'partition-0', pad(0))).sort()   // Bare lists a folder unsorted
  t.alike(files, [`${pad(0)}.json`, `${pad(1)}.json`])
  t.alike(JSON.parse(readFileSync(join(root, 'partition-0', pad(0), files[0]), 'utf8')), { value: { kind: 'a' } })
})

test('segments roll by policy, are archived into one object, sealed in a chain; offsets survive', async (t) => {
  const root = dir()
  const tp = await openTopic({ storage: folderStorage(root), roll: { records: 3 } })
  for (let i = 0; i < 8; i++) await tp.produce({ value: { i } })
  const names = readdirSync(join(root, 'partition-0')).sort()
  t.alike(names, [`${pad(0)}.json`, `${pad(3)}.json`, pad(6)])
  const archived = parseRecords('x.json', readFileSync(join(root, 'partition-0', `${pad(0)}.json`)))
  t.alike(archived.map(r => r.value.i), [0, 1, 2])
  t.alike((await tp.consume(0)).map(r => [r.offset, r.value.i]), [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]])
  t.alike((await tp.consume(4)).map(r => r.offset), [4, 5, 6, 7])
  const [first] = await tp.consume(3)
  t.ok(new RegExp(`^${pad(0)}:[0-9a-f]{64}$`).test(first.headers[0].value))
  t.is(first.headers[0].key, 'previousSegment')
  t.alike(await tp.verify(), { segments: 3, archived: 2, ok: true, problems: [] })
  // Tampering with an archived segment breaks the chain.
  const f = join(root, 'partition-0', `${pad(0)}.json`)
  writeFileSync(f, readFileSync(f, 'utf8').replace('"i":1', '"i":9'))
  t.is((await tp.verify()).ok, false)
})

test('a restart is no boundary: the producer finds the active segment and continues', async (t) => {
  const root = dir()
  let tp = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  for (let i = 0; i < 3; i++) await tp.produce({ value: { i } })
  tp = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  t.is(tp.endOffset(), 3)
  t.is(await tp.produce({ value: { i: 3 } }), 3)
  t.is(await tp.produce({ value: { i: 4 } }), 4) // rolls: the segment at 2 held 2
  t.alike((await tp.consume(0)).map(r => r.value.i), [0, 1, 2, 3, 4])
  t.is((await tp.verify()).ok, true)
  // Reopened after all segments were archived: the next record carries the seal.
  await tp.roll()
  tp = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  t.is(await tp.produce({ value: { i: 5 } }), 5)
  t.is((await tp.verify()).ok, true)
})

test('rolling by time', async (t) => {
  let clock = 0
  const tp = await openTopic({ storage: folderStorage(dir()), roll: { records: 100, ms: 1000 }, now: () => clock })
  await tp.produce({ value: { i: 0 } })
  clock = 1500
  await tp.produce({ value: { i: 1 } })
  t.alike(await tp.verify(), { segments: 2, archived: 1, ok: true, problems: [] })
})

test('fold builds state in offset order, at the latest offset or a past one', async (t) => {
  const tp = await openTopic({ storage: folderStorage(dir()), roll: { records: 2 } })
  for (const [k, v] of [['a', 1], ['b', 2], ['a', 3]]) await tp.produce({ value: { set: k, to: v } })
  const reducer = (s, r) => ({ ...s, [r.value.set]: r.value.to })
  t.alike(await tp.fold(reducer, {}), { a: 3, b: 2 })
  t.alike(await tp.fold(reducer, {}, { to: 1 }), { a: 1, b: 2 })
})

test('follow: told of records as they are produced', async (t) => {
  const tp = await openTopic({ storage: folderStorage(dir()) })
  await tp.produce({ value: { i: 0 } })
  const seen = []
  const stop = tp.follow(0, rs => { for (const r of rs) seen.push(r.offset) }, { every: 20 })
  await tp.produce({ value: { i: 1 } })
  await tp.produce({ value: { i: 2 } })
  for (let i = 0; i < 50 && seen.length < 3; i++) await new Promise(resolve => setTimeout(resolve, 20))
  stop()
  t.alike(seen, [0, 1, 2])
})

test('retention keeps the last archived segments; committed offsets resume a consumer', async (t) => {
  const root = dir()
  const tp = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  for (let i = 0; i < 7; i++) await tp.produce({ value: { i } })
  t.alike(await tp.retain({ segments: 1 }), [0, 2])
  t.alike((await tp.consume(0)).map(r => r.offset), [4, 5, 6])
  const offsets = await committedOffsets({ storage: folderStorage(join(root, 'offsets-viewer')) })
  t.is(await offsets.committed(), null)
  await offsets.commit(5)
  t.is(await offsets.committed(), 5)
})

test('an archive written before its directory was removed: the archive wins, the directory goes', async (t) => {
  const root = dir()
  let tp = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  for (let i = 0; i < 2; i++) await tp.produce({ value: { i } })
  await tp.roll()
  // Simulate the crash: the directory comes back next to its archive.
  const d = join(root, 'partition-0', pad(0))
  const { mkdirSync } = await import('bare-fs')
  mkdirSync(d)
  writeFileSync(join(d, `${pad(0)}.json`), '{"value":{"stale":true}}\n')
  tp = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  t.alike((await tp.consume(0)).map(r => r.value.i), [0, 1])
  t.is(existsSync(d), false)
})

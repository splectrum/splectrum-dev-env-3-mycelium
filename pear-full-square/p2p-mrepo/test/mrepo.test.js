import test from 'brittle'
import { mkdtempSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { spawnSync } from 'bare-subprocess'
import { openStore } from 'p2p-store'
import { replicator } from 'p2p-replicate'
import { openRepo, writer, writeBundle, nativeBackend } from '../../mycelium-git/index.js'
import { mrepos } from '../index.js'

// A command run to its end (Bare's bare-subprocess has no execFileSync): its
// output; a failure throws, with what it said.
const execFileSync = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: exit ${r.status}: ${String(r.stderr)}`); return r.stdout }

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-mrepo-'))
const fixtureScript = new URL('../../mycelium-git/test/fixture.sh', import.meta.url).pathname
const nativeFixture = () => { const d = join(dir(), 'fixture.git'); execFileSync('sh', [fixtureScript, d]); return d }
const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'

test('create, write through mycelium, reopen on start: the same repository', async (t) => {
  const storage = dir()
  let store = await openStore({ storage })
  let repos = mrepos({ store })
  const repo = await repos.create('notes')
  t.ok(/^[0-9a-f-]{36}$/.test(repo.id))
  const w = writer(repo.backend)
  await w.createLayer('main', 'Create main', { author, time })
  const c = await w.change('main')
  await c.put('/readme.md', 'hello')
  await c.commit('Put readme', { author, time })
  await t.exception(repos.create('notes'), /exists/)
  const given = await repos.create('given', { id: '12345678-1234-4234-8234-123456789abc' })
  t.is(given.id, '12345678-1234-4234-8234-123456789abc')
  await store.close()

  store = await openStore({ storage })
  repos = mrepos({ store })
  t.alike((await repos.list()).map(r => [r.name, r.id]), [['given', '12345678-1234-4234-8234-123456789abc'], ['notes', repo.id]])
  const again = await repos.open('notes')
  t.is(again.key, repo.key)
  t.is(again.id, repo.id)
  t.is((await openRepo(again.backend).read('/main/readme.md')).toString(), 'hello')
  await store.close()
})

test('import from the boundary: a native repository and a bundle, the same commits', async (t) => {
  const native = nativeFixture()
  const store = await openStore({ storage: dir() })
  const repos = mrepos({ store })
  const a = await repos.import('from-native', { native })
  const expected = await nativeBackend(native).listBranches()
  t.alike(await a.backend.listBranches(), expected)
  t.is(a.branches, 4)
  t.is(a.origin.kind, 'native')
  const bundle = await writeBundle(a.backend, Object.fromEntries(expected))
  const b = await repos.import('from-bundle', { bundle })
  t.alike(await b.backend.listBranches(), expected)
  t.is(b.origin.kind, 'bundle')
  t.is(b.origin.bytes, bundle.length)
  await store.close()
})

test('clone: the same history under a new key and id, its origin recorded', async (t) => {
  const store = await openStore({ storage: dir() })
  const repos = mrepos({ store })
  const a = await repos.import('a', { native: nativeFixture() })
  const b = await repos.clone(a, 'b')
  const c = await repos.clone(a, 'c', { id: '12345678-1234-4234-8234-123456789abc' })
  t.is(c.id, '12345678-1234-4234-8234-123456789abc')
  t.not(b.key, a.key)
  t.not(b.id, a.id)
  t.alike(await b.backend.listBranches(), await a.backend.listBranches())
  t.alike(b.origin, { kind: 'clone', id: a.id, key: a.key, branches: Object.fromEntries(await a.backend.listBranches()) })
  const recorded = JSON.parse((await b.drive.get('/mrepo.json')).toString())
  t.alike(recorded.origin, b.origin)
  await store.close()
})

test('a replica by key: read through mycelium, lazily, read only', async (t) => {
  const s1 = await openStore({ storage: dir() })
  const s2 = await openStore({ storage: dir() })
  const a = await mrepos({ store: s1 }).import('a', { native: nativeFixture() })
  const r1 = replicator({ store: s1 })
  const r2 = replicator({ store: s2 })
  const x = r1.replicate(true)
  const y = r2.replicate(false)
  x.pipe(y).pipe(x)
  const replica = await mrepos({ store: s2 }).replica(a.key)
  r2.track(replica.drive)
  await replica.drive.update({ wait: true })
  t.is((await replica.info()).id, a.id)
  const repo = openRepo(replica.backend)
  t.is((await repo.read('/main/readme')).toString(), 'hello')
  t.is((await repo.read('/overlay/config/docs/a')).toString(), 'conf')
  // Lazily: of the objects the repository holds (one blob each), only those
  // read came over (what is held from the start is no measure: a small
  // index can arrive whole).
  const blobs = r2.metrics().filter(m => m.part === 'blobs').reduce((n, m) => n + m.downloaded.blocks, 0)
  const total = s2.resources().find(r => r.how === 'replica').blobs.length
  t.ok(blobs > 0 && blobs < total, `only what was read: ${blobs} of ${total} blobs`)
  t.is(replica.drive.writable, false)
  await s1.close()
  await s2.close()
})

test('events: names, ids and keys, never a secret', async (t) => {
  const events = []
  const store = await openStore({ storage: dir(), observer: e => events.push(e) })
  const repos = mrepos({ store, observer: e => events.push(e) })
  const a = await repos.import('a', { native: nativeFixture() })
  await repos.clone(a, 'b')
  t.is(await repos.open('a'), await repos.open('a'), 'an open repository is given again')
  const kinds = events.filter(e => e.module === 'p2p-mrepo').map(e => e.kind)
  t.alike(kinds, ['repo-created', 'repo-imported', 'repo-created', 'repo-cloned'])
  const secret = store.corestore.primaryKey.toString('hex')
  t.ok(!JSON.stringify(events).includes(secret))
  await store.close()
})

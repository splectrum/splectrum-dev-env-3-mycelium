// The contract suite: the same tests, run against every backend.
//   contract(name, makeBackend), makeBackend(gitdir) → backend (or a promise)
// Each run builds the fixture repository (test/fixture.sh).

import test, { hook } from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openRepo, pinned, writer } from '../index.js'
import { sameName } from 'mycelium-uri'

// A command run to its end (Bare's bare-subprocess has no execFileSync): its
// output; a failure throws, with what it said.
const execFileSync = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: exit ${r.status}: ${String(r.stderr)}`); return r.stdout }

export function fixture () {
  const dir = join(mkdtempSync(join(tmpdir(), 'mycelium-git-')), 'repo')
  execFileSync('sh', [new URL('./fixture.sh', import.meta.url).pathname, dir])
  return dir
}

const paths = found => found.map(([p]) => p)
const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'

export function contract (name, makeBackend) {
  // Reading: one fixture, never written.
  let repo, backend
  hook(`${name}: its fixture`, async () => {
    backend = await makeBackend(fixture())
    repo = openRepo(backend)
  })
  test(`${name}: above the branches: name segments`, async (t) => {
    t.alike(paths(await repo.select('/*')), ['/execute', '/main', '/overlay', '/pending'])
    t.alike(paths(await repo.select('/pending/*')), ['/pending/default'])
    t.alike(paths(await repo.select('/*/*')), ['/execute/main', '/main/README.md', '/main/docs', '/main/readme', '/overlay/config', '/pending/default'])
  })

  test(`${name}: into a branch`, async (t) => {
    t.alike(paths(await repo.select('/main/*')), ['/main/README.md', '/main/docs', '/main/readme'])
    t.alike(paths(await repo.select('/pending/default/pending/*')), ['/pending/default/pending/r1'])
    t.alike(paths(await repo.select('/*/docs/a')), ['/main/docs/a'])
    t.alike(paths(await repo.select('/*/*/docs/a')), ['/execute/main/docs/a', '/overlay/config/docs/a'])
    t.alike(await repo.select('/main/nope'), [])
  })

  test(`${name}: read`, async (t) => {
    t.is((await repo.read('/main/readme')).toString(), 'hello')
    t.is((await repo.read('/overlay/config/docs/a')).toString(), 'conf')
    t.is((await repo.read('/main/README.md')).toString(), 'convention')
    await t.exception(repo.read('/main/readme.md'), /not a file/)
    t.is((await repo.read('/main/readme.md', sameName)).toString(), 'convention')
    await t.exception(repo.read('/main/docs'), /not a file/)
    await t.exception(repo.read('/main/nope'), /not a file/)
  })

  test(`${name}: pinned: a repository at a recorded state`, async (t) => {
    const branches = Object.fromEntries(await backend.listBranches())
    const old = openRepo(pinned(backend, { main: branches.main }))
    t.alike(paths(await old.select('/*')), ['/main'])
    t.is((await old.read('/main/readme')).toString(), 'hello')
  })

  // Writing: a fixture of its own, written in sequence.
  let wb, wrepo, w
  hook(`${name}: its fixture`, async () => {
    wb = await makeBackend(fixture())
    wrepo = openRepo(wb)
    w = writer(wb)
  })
  const head = async b => Object.fromEntries(await wb.listBranches())[b]
  const text = async p => (await wrepo.read(p)).toString()

  test(`${name}: change: put and remove, one commit`, async (t) => {
    const before = await head('main')
    const c = await w.change('main')
    await c.put('/notes/one.md', 'one')
    await c.put('/notes/two.md', 'two')
    await c.put('/readme', 'changed')
    c.remove('/docs/b')
    const oid = await c.commit('Change main', { author, time })
    t.is(await head('main'), oid)
    t.alike((await wb.readCommit(oid)).parents, [before])
    t.is(await text('/main/notes/two.md'), 'two')
    t.is(await text('/main/readme'), 'changed')
    t.alike((await wrepo.select('/main/docs/*')).map(([p]) => p), ['/main/docs/a'])
  })

  test(`${name}: a tree's entries come in git's order`, async (t) => {
    // Git orders a tree's entries by name, a folder's as if it ended in
    // '/': 'a-b' (a file) before 'a' (a folder), where plain name order
    // gives the reverse. Selection follows the tree, so every engine gives
    // git's order.
    const c = await w.change('main')
    await c.put('/order/a-b', 'file')
    await c.put('/order/a/c', 'in a folder')
    await c.commit('Order', { author, time })
    t.alike((await wrepo.select('/main/order/*')).map(([p]) => p), ['/main/order/a-b', '/main/order/a'])
    const c2 = await w.change('main')
    c2.remove('/order/a-b')
    c2.remove('/order/a/c')
    await c2.commit('Order removed', { author, time })
  })

  test(`${name}: change: emptied folders disappear`, async (t) => {
    const c = await w.change('main')
    c.remove('/notes/one.md')
    c.remove('/notes/two.md')
    await c.commit('Remove notes', { author, time })
    t.alike(await wrepo.select('/main/notes'), [])
  })

  test(`${name}: change: conflicts and missing paths throw`, async (t) => {
    const a = await w.change('main')
    await a.put('/docs', 'file over folder')
    await t.exception(a.commit('x', { author, time }), /conflict: \/docs is a folder/)
    const b = await w.change('main')
    await b.put('/readme/x', 'folder under file')
    await t.exception(b.commit('x', { author, time }), /conflict: \/readme is a file/)
    const c = await w.change('main')
    c.remove('/nope')
    await t.exception(c.commit('x', { author, time }), /not found: \/nope/)
    await t.exception(w.change('nope'), /no branch: nope/)
  })

  test(`${name}: change: a concurrent change fails, nothing is overwritten`, async (t) => {
    const a = await w.change('main')
    const b = await w.change('main')
    await a.put('/a', 'a')
    await b.put('/b', 'b')
    await a.commit('a', { author, time })
    await t.exception(b.commit('b', { author, time }))
    t.alike(await wrepo.select('/main/b'), [])
  })

  test(`${name}: merge: plain merge commit, nothing to do when merged`, async (t) => {
    const main = await head('main')
    await w.merge('main', 'execute/main', 'sync', { author, time, fastForward: true })
    const c = await w.change('execute/main')
    await c.put('/responses/r1.md', 'done')
    const exec = await c.commit('Respond', { author, time })
    const m = await w.merge('execute/main', 'main', 'Merge execute/main', { author, time })
    t.alike((await wb.readCommit(m)).parents, [main, exec])
    t.is(await text('/main/responses/r1.md'), 'done')
    t.is(await w.merge('execute/main', 'main', 'again', { author, time }), m)
  })

  test(`${name}: merge: fast-forward only when asked`, async (t) => {
    const main = await head('main')
    t.is(await w.merge('main', 'execute/main', 'sync', { author, time, fastForward: true }), main)
    t.is(await head('execute/main'), main)
  })

  test(`${name}: merge: disjoint layers are never merged`, async (t) => {
    await t.exception(w.merge('overlay/config', 'main', 'm', { author, time }), /disjoint layers/)
  })

  test(`${name}: createLayer: orphans under layer segments, leaves only`, async (t) => {
    const oid = await w.createLayer('data/sets', 'Create data/sets', { author, time })
    t.alike((await wb.readCommit(oid)).parents, [])
    t.alike(await wrepo.select('/data/sets/*'), [])
    await t.exception(w.createLayer('data/sets', 'x', { author, time }), /exists: data\/sets/)
    await t.exception(w.createLayer('data/sets/more', 'x', { author, time }), /not a leaf/)
    await t.exception(w.createLayer('overlay', 'x', { author, time }), /not a layer: overlay/)
    await t.exception(w.createLayer('overlay/config/x', 'x', { author, time }), /not a leaf/)
    await t.exception(w.createLayer('execute/main', 'x', { author, time }), /not a layer/)
    await t.exception(w.createLayer('publish/x', 'x', { author, time }), /not a layer/)
    await t.exception(w.createLayer('main/x', 'x', { author, time }), /not a layer/)
    await t.exception(w.createLayer('other/x', 'x', { author, time }), /not a layer/)
  })

  test(`${name}: createExecution and deleteBranch: only once merged`, async (t) => {
    const c = await w.change('data/sets')
    await c.put('/a.md', 'a')
    await c.commit('Put', { author, time })
    const from = await w.createExecution('data/sets')
    t.is(await head('execute/data/sets'), from)
    await t.exception(w.createExecution('data/sets'), /exists/)
    await t.exception(w.createExecution('nope'), /no branch: nope/)
    const d = await w.change('execute/data/sets')
    await d.put('/b.md', 'b')
    await d.commit('Respond', { author, time })
    await t.exception(w.deleteBranch('execute/data/sets', 'data/sets'), /not merged/)
    await w.merge('execute/data/sets', 'data/sets', 'Merge', { author, time })
    await w.deleteBranch('execute/data/sets', 'data/sets')
    t.is(await head('execute/data/sets'), undefined)
    t.is(await text('/data/sets/b.md'), 'b')
    await t.exception(w.deleteBranch('main', 'execute/main'), /permanent: main/)
    await t.exception(w.deleteBranch('nope', 'main'), /no branch: nope/)
  })

  test(`${name}: commitTree: a checkpoint replacing the whole tree`, async (t) => {
    const before = await head('data/sets')
    const blob = await wb.writeBlob('only')
    const tree = await wb.writeTree([{ name: 'only.md', mode: '100644', type: 'blob', oid: blob }])
    const oid = await w.commitTree('data/sets', tree, 'Replace', { author, time })
    t.alike((await wb.readCommit(oid)).parents, [before])
    t.alike((await wrepo.select('/data/sets/*')).map(([p]) => p), ['/data/sets/only.md'])
    await t.exception(w.commitTree('nope', tree, 'x', { author, time }), /no branch: nope/)
  })

  test(`${name}: init: a new, empty, bare repository`, async (t) => {
    const dir = join(mkdtempSync(join(tmpdir(), 'init-')), 'new')
    const b = await makeBackend(dir)
    await b.init()
    t.alike(await b.listBranches(), [])
    const tree = await b.writeTree([])
    const c = await b.writeCommit({ tree, parents: [], message: 'First', author, time })
    await b.updateBranch('main', c, null)
    t.alike(await b.listBranches(), [['main', c]])
  })

  test(`${name}: raw objects: read, write, has`, async (t) => {
    const main = await head('main')
    const { type, object } = await wb.readObject(main)
    t.is(type, 'commit')
    t.is(await wb.writeObject(type, object), main)
    t.ok(await wb.hasObject(main))
    t.ok(!await wb.hasObject('0123456789012345678901234567890123456789'))
  })

  test(`${name}: importLayer: new under the layer rules, existing only forward`, async (t) => {
    const start = await head('data/sets')
    const c = await w.change('data/sets')
    await c.put('/c.md', 'c')
    const next = await c.commit('Put', { author, time })
    await t.exception(w.importLayer('data/copy', '0123456789012345678901234567890123456789'), /no commit/)
    t.is(await w.importLayer('data/copy', start), start)
    t.is(await w.importLayer('data/copy', start), start)
    t.is(await w.importLayer('data/copy', next), next)
    await t.exception(w.importLayer('data/copy', start), /diverged: data\/copy/)
    await t.exception(w.importLayer('other/x', start), /not a layer/)
    await t.exception(w.importLayer('data/copy/x', start), /not a leaf/)
  })

  test(`${name}: merge: conflicts throw`, async (t) => {
    await wb.updateBranch('side', await head('main'), null)
    const a = await w.change('main')
    await a.put('/readme', 'main says')
    await a.commit('a', { author, time })
    const b = await w.change('side')
    await b.put('/readme', 'side says')
    await b.commit('b', { author, time })
    await t.exception(w.merge('side', 'main', 'm', { author, time }), /merge conflicts: readme/)
  })
}

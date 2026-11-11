// The boot protocol's actions on a parent built from a structure holding a
// child's definition (/main/host/mrepo/), with a context like the execute
// protocol's: reads from the repository, writes collected, then committed.
import test from 'brittle'
import fs, { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from 'bare-fs'
import crypto from 'bare-crypto'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openRepo, writer, p2pgitBackend } from 'mycelium-git'
import { gitdirOf, record, wrap, guid } from 'mrepo-base-request'
import { ask } from 'mrepo-base-runtime'
import { spawnSync } from 'bare-subprocess'
import { build, deploy, teardown, redeploy, place, parseSource } from '../index.js'

const lj = (dir, mode) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'layer.json'), JSON.stringify({ mode, description: 'test' })) }

// A parent's structure: main (with the child's definition), runtime.
function structure (root) {
  lj(join(root, 'main'), 'atomic')
  lj(join(root, 'runtime'), 'atomic')
  const def = join(root, 'main', 'host', 'mrepo')
  lj(join(def, 'main'), 'atomic')
  lj(join(def, 'runtime'), 'atomic')
  writeFileSync(join(def, 'runtime', 'service.json'), JSON.stringify({ state: 'booted', type: 'haicc' }))
  // the child's packages: the same as the parent's
  lj(join(def, 'packages'), 'replicated')
  writeFileSync(join(def, 'packages', 'layer.json'), JSON.stringify({ mode: 'replicated', packages: ['haiccing/fake'] }))
  lj(join(root, 'packages'), 'replicated')
}

// A source by organisation holding one package (a bundle, its manifest).
function source (dir) {
  mkdirSync(join(dir, 'haiccing'), { recursive: true })
  const bytes = Buffer.from('a bundle, for the test')
  writeFileSync(join(dir, 'haiccing', 'fake.bundle'), bytes)
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  writeFileSync(join(dir, 'haiccing', 'manifest.json'), JSON.stringify({ packages: { 'haiccing/fake': { file: 'haiccing/fake.bundle', id: 'x', sha256, addons: [] } } }))
}

// An execution's context: reads the repository, writes collected and
// committed to main after the action (as the execute protocol does).
function context (work, backend) {
  const repo = openRepo(backend)
  const edits = []
  const exec = {
    runtime: { name: 'boot', work },
    select: uri => repo.select(uri),
    read: uri => repo.read(uri),
    put: (uri, bytes) => edits.push(['put', uri, bytes]),
    remove: uri => edits.push(['remove', uri]),
    commit: () => commit()
  }
  async function commit () {
    if (!edits.length) return
    const c = await writer(backend).change('main')
    for (const [op, uri, bytes] of edits.splice(0)) op === 'put' ? await c.put(uri.slice('/main'.length), bytes) : c.remove(uri.slice('/main'.length))
    await c.commit('test', { author: { name: 'test', email: 'test@localhost' } })
  }
  return { exec, commit, repo }
}

test('deploy, teardown, redeploy a child', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-'))
  const src = mkdtempSync(join(tmpdir(), 'deploy-src-'))
  try {
    structure(src)
    await build({ from: src, work, name: 'boot' })
    // the parent's packages put in place from a folder source (as the boot's are)
    const pkgs = mkdtempSync(join(tmpdir(), 'deploy-pkgs-'))
    source(pkgs)
    await place({ work, name: 'boot', sources: [parseSource(`folder:${pkgs}`)], list: ['haiccing/fake'] })
    rmSync(join(work, 'packages'), { recursive: true, force: true }) // the store emptied: the child's sourced again, from the recorded source
    const backend = p2pgitBackend(gitdirOf(work, 'boot'), { fs })
    const { exec, commit, repo } = context(work, backend)
    const setting = readFileSync(join(work, 'mrepo.json'), 'utf8')

    const d = await deploy(exec, { uri: '/host' })
    await commit()
    t.is(d.deployed, '/host')
    t.alike(Object.keys(d.layers).sort(), ['main', 'packages', 'runtime'], 'built from its definition')
    t.ok(existsSync(gitdirOf(work, 'host')), 'the child: <work>/mrepos/host/.git')
    const child = openRepo(p2pgitBackend(gitdirOf(work, 'host'), { fs }))
    t.is(JSON.parse((await child.read('/runtime/service.json')).toString()).type, 'haicc')
    t.is(JSON.parse((await repo.read('/main/host.json')).toString()).name, 'host', 'linked into the parent\'s main')
    t.is(readFileSync(join(work, 'mrepo.json'), 'utf8'), setting, 'the work folder\'s setting still the parent\'s')
    t.alike(d.packages, ['haiccing/fake'], 'its packages put in place')
    const inStore = join(work, 'packages', 'haiccing', 'fake.bundle')
    const inChild = join(work, 'mrepos', 'host', 'packages', 'haiccing', 'fake.bundle')
    t.is(statSync(inStore).ino, statSync(inChild).ino, 'from the store, hard linked (sourced from the parent\'s recorded source)')
    t.ok(JSON.parse((await child.read('/packages/manifest.json')).toString()).packages['haiccing/fake'], 'the child\'s packages layer: the list and hashes')
    await t.exception(deploy(exec, { uri: '/host' }), /deployed already/)

    const r = await redeploy(exec, { uri: '/host' })
    await commit()
    t.is(r.tornDown, '/host')
    t.is(r.deployed, '/host', 'redeployed')
    t.ok((await repo.select('/main/host.json')).length, 'linked again')

    t.alike(await teardown(exec, { uri: '/host' }), { tornDown: '/host' })
    await commit()
    t.absent(existsSync(join(work, 'mrepos', 'host')), 'the child removed')
    t.absent((await repo.select('/main/host.json')).length, 'its link out of main')
    await t.exception(teardown(exec, { uri: '/host' }), /not deployed/)
    await t.exception(deploy(exec, { uri: '/nothing' }), /no definition/)
    await t.exception(deploy(exec, { uri: '/../x' }), /not a child/)
    rmSync(pkgs, { recursive: true, force: true })
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(src, { recursive: true, force: true })
  }
})

// The runtime's bundle as the development repository's sources hold it
// (tools/package-bundle.js); the test skipped without.
const SOURCES = join(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '..', '..', '..', 'sources')
const haveRuntime = existsSync(join(SOURCES, 'haiccing', 'base-package-runtime.bundle'))

test('deploy starts the child\'s runtime from its own packages; teardown stops it', { timeout: 60000, skip: !haveRuntime }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-rt-'))
  const src = mkdtempSync(join(tmpdir(), 'deploy-rt-src-'))
  try {
    lj(join(src, 'main'), 'atomic')
    lj(join(src, 'runtime'), 'atomic')
    lj(join(src, 'packages'), 'replicated')
    const def = join(src, 'main', 'host', 'mrepo')
    for (const l of ['main', 'runtime', 'inbox', 'outbox', 'request/pending/default', 'request/execute', 'request/done']) lj(join(def, l), l.startsWith('request') || l.endsWith('box') ? 'non-atomic' : 'atomic')
    writeFileSync(join(def, 'runtime', 'service.json'), JSON.stringify({ state: 'started', type: 'host' }))
    writeFileSync(join(def, 'runtime', 'api.json'), JSON.stringify({ api: 'host', types: [{ uri: '/', protocols: { rest: ['get'] } }, { uri: '/runtime', deep: true, protocols: { rest: ['get'] } }] }))
    lj(join(def, 'packages'), 'replicated')
    writeFileSync(join(def, 'packages', 'layer.json'), JSON.stringify({ mode: 'replicated', packages: ['haiccing/base-package-runtime'] }))
    await build({ from: src, work, name: 'boot' })
    await place({ work, name: 'boot', sources: [parseSource(`folder:${SOURCES}`)], list: [] })
    const backend = p2pgitBackend(gitdirOf(work, 'boot'), { fs })
    const { exec, commit } = context(work, backend)
    const d = await deploy(exec, { uri: '/host' })
    await commit()
    const view = join(work, 'mrepos', 'host')
    t.ok(d.runtime?.pid, 'its runtime started')
    const s = await ask({ repo: view, op: 'status' })
    t.is(s?.repository.name, 'host', 'running the child, by its directory')
    t.ok(existsSync(join(view, 'runtime.sock')), 'its socket in its directory')
    // a request into its inbox: answered (its inbox operational)
    const core = record('/test', { api: 'host', protocol: 'rest', action: 'get', uri: '/runtime/service.json' }, guid())
    writeFileSync(join(view, 'inbox', `${core.key}.json`), JSON.stringify(wrap('/host/inbox', core)))
    const child = openRepo(p2pgitBackend(join(view, '.git'), { fs }))
    let back = null
    for (let i = 0; i < 100 && !back; i++) { back = await child.read(`/outbox/${core.key}.json`).then(b => JSON.parse(b.toString()), () => null); if (!back) await new Promise(resolve => setTimeout(resolve, 100)) }
    t.is(back?.value.value.output.type, 'host', 'its inbox operational: a request answered')
    await teardown(exec, { uri: '/host' })
    await commit()
    t.is(await ask({ repo: view, op: 'status' }), null, 'teardown: its runtime stopped')
    t.absent(spawnSync('kill', ['-0', String(d.runtime.pid)], { stdio: 'ignore' }).status === 0, 'its process ended')
    t.absent(existsSync(view), 'and removed')
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(src, { recursive: true, force: true })
  }
})

// The boot protocol's actions, with a context like the execute protocol's
// (reads from the repository, writes collected, then committed; exec.commit()
// a local commit). A parent built with its packages manifest naming the
// store; the child deployed from a target package's list, inside the parent.
import test from 'brittle'
import fs, { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from 'bare-fs'
import crypto from 'bare-crypto'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import Bundle from 'bare-bundle'
import { openRepo, writer, p2pgitBackend } from 'mycelium-git'
import { record, wrap, guid } from 'mrepo-base-request'
import { ask } from 'mrepo-base-runtime'
import { spawnSync } from 'bare-subprocess'
import { build, deploy, teardown, redeploy, place, parseSource } from '../index.js'

const lj = (dir, mode) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'layer.json'), JSON.stringify({ mode, description: 'test' })) }
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex')
const json = b => JSON.parse(b.toString())

// A source by organisation holding bundles whose mrepo/ parts are given.
function source (dir, packages) {
  mkdirSync(join(dir, 'haiccing'), { recursive: true })
  const manifest = { packages: {} }
  for (const [pkg, files] of Object.entries(packages)) {
    const b = new Bundle()
    for (const [p, v] of Object.entries(files)) b.write(`/mrepo/${p}`, Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)))
    const bytes = b.toBuffer()
    writeFileSync(join(dir, `${pkg}.bundle`), bytes)
    manifest.packages[pkg] = { file: `${pkg}.bundle`, id: pkg, sha256: sha256(bytes), entries: [], addons: [] }
  }
  writeFileSync(join(dir, 'haiccing', 'manifest.json'), JSON.stringify(manifest))
}

// A parent: main, runtime, packages; its packages manifest (the store, the sources).
async function parent (work, sources) {
  const src = mkdtempSync(join(tmpdir(), 'deploy-parent-'))
  try {
    for (const l of ['main', 'runtime', 'packages']) lj(join(src, l), 'atomic')
    const { dir } = await build({ from: src, work, name: 'boot' })
    await place({ dir, store: join(work, 'packages'), sources, list: [] })
    return dir
  } finally { rmSync(src, { recursive: true, force: true }) }
}

// An execution's context: reads the repository, writes collected and
// committed to main after the action (exec.commit(): a local commit).
function context (dir, backend) {
  const repo = openRepo(backend)
  const edits = []
  const exec = {
    runtime: { name: 'boot', dir },
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

test('deploy from a target package\'s list, inside the parent; redeploy; teardown', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-'))
  const pkgs = mkdtempSync(join(tmpdir(), 'deploy-src-'))
  try {
    source(pkgs, {
      'haiccing/base': { 'runtime/layer.json': { mode: 'atomic' }, 'runtime/kind.json': { kind: 'base' }, 'inbox/layer.json': { mode: 'non-atomic' } },
      'haiccing/target': { 'main/layer.json': { mode: 'atomic' }, 'runtime/kind.json': { kind: 'target' }, 'packages/layer.json': { mode: 'replicated', packages: ['haiccing/base', 'haiccing/target'] } }
    })
    const dir = await parent(work, [parseSource(`folder:${pkgs}`)])
    const backend = p2pgitBackend(join(dir, '.git'), { fs })
    const { exec, commit, repo } = context(dir, backend)

    await t.exception(deploy(exec, { uri: '/host' }), /no package/, 'the target named in the body')
    const d = await deploy(exec, { uri: '/host', body: { package: 'haiccing/target' } })
    await commit()
    const host = join(dir, 'main', 'host')
    t.is(d.deployed, '/host')
    t.ok(existsSync(join(host, '.git')), 'built inside the parent: main/host/')
    t.alike(Object.keys(d.layers).sort(), ['inbox', 'main', 'packages', 'runtime'], 'the layers of every listed package')
    const child = openRepo(p2pgitBackend(join(host, '.git'), { fs }))
    t.alike(json(await child.read('/runtime/kind.json')), { kind: 'target' }, 'laid in in order: a later package\'s file replaces')
    t.alike(d.packages, ['haiccing/base', 'haiccing/target'], 'its packages, in order')
    t.is(statSync(join(work, 'packages', 'haiccing', 'base.bundle')).ino, statSync(join(host, 'packages', 'haiccing', 'base.bundle')).ino, 'each linked from the store')
    t.alike(json(await repo.read('/main/host.json')).package, 'haiccing/target', 'its type recorded at the node')
    await t.exception(deploy(exec, { uri: '/host', body: { package: 'haiccing/target' } }), /deployed already/)

    const r = await redeploy(exec, { uri: '/host' })
    await commit()
    t.is(r.tornDown, '/host')
    t.is(r.package, 'haiccing/target', 'redeployed, its type as recorded')

    t.alike(await teardown(exec, { uri: '/host' }), { tornDown: '/host' })
    await commit()
    t.absent(existsSync(host), 'removed')
    t.is(await repo.read('/main/host.json').catch(() => null), null, 'its record out of main')
    await t.exception(teardown(exec, { uri: '/host' }), /not deployed/)
    await t.exception(deploy(exec, { uri: '/x', body: { package: 'haiccing/none' } }), /not in the store nor the sources/)
    await t.exception(deploy(exec, { uri: '/../x', body: { package: 'haiccing/target' } }), /not a child/)
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(pkgs, { recursive: true, force: true })
  }
})

// The runtime's bundle as the development repository's sources hold it
// (tools/package-bundle.js); the test skipped without.
const SOURCES = join(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '..', '..', '..', 'sources')
const haveRuntime = existsSync(join(SOURCES, 'haiccing', 'base-package-runtime.bundle'))

test('deploy the runtime: the child\'s runtime started from its own packages, its inbox answering; teardown stops it', { timeout: 60000, skip: !haveRuntime }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-rt-'))
  try {
    const dir = await parent(work, [parseSource(`folder:${SOURCES}`)])
    const backend = p2pgitBackend(join(dir, '.git'), { fs })
    const { exec, commit } = context(dir, backend)
    const d = await deploy(exec, { uri: '/host', body: { package: 'haiccing/base-package-runtime' } })
    await commit()
    const host = join(dir, 'main', 'host')
    t.ok(d.runtime?.pid, 'its runtime started')
    t.is((await ask({ repo: host, op: 'status' }))?.repository.name, 'host', 'running the child, by its directory')
    // a request into its inbox folder (the parent reaches it, forward): answered
    const core = record('/test', { protocol: 'rest', action: 'get', uri: '/runtime' }, guid())
    writeFileSync(join(host, 'inbox', `${core.key}.json`), JSON.stringify(wrap('/host/inbox', core)))
    const child = openRepo(p2pgitBackend(join(host, '.git'), { fs }))
    let back = null
    for (let i = 0; i < 100 && !back; i++) { back = await child.read(`/outbox/${core.key}.json`).then(json, () => null); if (!back) await new Promise(resolve => setTimeout(resolve, 100)) }
    t.ok(back?.value.value.output, 'its inbox operational: a request answered (no service: no gate)')
    let inFolder = null
    for (let i = 0; i < 50 && !inFolder; i++) { inFolder = existsSync(join(host, 'outbox', `${core.key}.json`)) ? JSON.parse(readFileSync(join(host, 'outbox', `${core.key}.json`))) : null; if (!inFolder) await new Promise(resolve => setTimeout(resolve, 100)) }
    t.alike(inFolder?.value.value, back.value.value, 'and in its outbox folder, as committed (for a subscriber)')
    await teardown(exec, { uri: '/host' })
    await commit()
    t.is(await ask({ repo: host, op: 'status' }), null, 'teardown: its runtime stopped')
    t.absent(spawnSync('kill', ['-0', String(d.runtime.pid)], { stdio: 'ignore' }).status === 0, 'its process ended')
    t.absent(existsSync(host), 'and removed')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

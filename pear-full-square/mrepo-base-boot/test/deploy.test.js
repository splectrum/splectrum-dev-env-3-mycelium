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
import { spawn, spawnSync } from 'bare-subprocess'
import process from 'bare-process'
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

// A parent: main, runtime, packages, xpath; its packages manifest (the store, the sources).
async function parent (work, sources) {
  const src = mkdtempSync(join(tmpdir(), 'deploy-parent-'))
  try {
    for (const l of ['main', 'runtime', 'packages', 'xpath']) lj(join(src, l), 'atomic')
    const { dir } = await build({ from: src, work, name: 'boot' })
    await place({ dir, store: join(work, 'packages'), sources, list: [] })
    return dir
  } finally { rmSync(src, { recursive: true, force: true }) }
}

// An execution's context: reads the repository, writes collected and
// committed to their layers after the action (exec.commit(): a local commit).
function context (dir, backend) {
  const repo = openRepo(backend)
  const edits = []
  const exec = {
    runtime: { name: 'boot', uri: 'local/boot', dir },
    select: uri => repo.select(uri),
    read: uri => repo.read(uri),
    put: (uri, bytes) => edits.push(['put', uri, bytes]),
    remove: uri => edits.push(['remove', uri]),
    commit: () => commit()
  }
  async function commit () {
    if (!edits.length) return
    const all = edits.splice(0)
    for (const l of new Set(all.map(([, uri]) => uri.split('/')[1]))) {
      const c = await writer(backend).change(l)
      for (const [op, uri, bytes] of all.filter(([, uri]) => uri.split('/')[1] === l)) op === 'put' ? await c.put(uri.slice(l.length + 1), bytes) : c.remove(uri.slice(l.length + 1))
      await c.commit('test', { author: { name: 'test', email: 'test@localhost' } })
    }
  }
  return { exec, commit, repo }
}

test('deploy from a target package\'s list, inside the parent; redeploy; teardown', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-'))
  const pkgs = mkdtempSync(join(tmpdir(), 'deploy-src-'))
  try {
    source(pkgs, {
      'haiccing/base': { 'runtime/layer.json': { mode: 'atomic' }, 'runtime/kind.json': { kind: 'base' }, 'runtime/hooks/boot/base.json': ['x/y'], 'inbox/layer.json': { mode: 'non-atomic' } },
      'haiccing/target': { 'main/layer.json': { mode: 'atomic' }, 'runtime/kind.json': { kind: 'target' }, 'packages/layer.json': { mode: 'replicated', packages: ['haiccing/base', 'haiccing/target'] } }
    })
    const dir = await parent(work, [parseSource(`folder:${pkgs}`)])
    const backend = p2pgitBackend(join(dir, '.git'), { fs })
    const { exec, commit, repo } = context(dir, backend)

    await t.exception(deploy(exec, { uri: 'main/host' }), /missing argument: package/, 'the package: its first argument, missing said')
    await t.exception(deploy(exec, { uri: 'main', args: ['haiccing/target'] }), /missing argument: target/, 'a target of main itself: the mrepo, which one cannot deploy; missing')
    await t.exception(teardown(exec, { uri: 'main' }), /missing argument: target/, 'nor tear down')
    await t.exception(deploy(exec, { uri: '.', args: ['haiccing/target'] }), /missing argument: target/, 'the root the same')
    await t.exception(deploy(exec, { uri: 'host', args: ['haiccing/target'] }), /not a position in main: host \(main\/<name>\)/, 'from the root the layer comes first')
    // a position that exists locally (data in main there): not a target
    exec.put('/main/notes/a.json', Buffer.from('1'))
    await commit()
    await t.exception(deploy(exec, { uri: 'main/notes', args: ['haiccing/target'] }), /^Error: notes exists locally: the boot protocol cannot target it|^notes exists locally: the boot protocol cannot target it/, 'a local folder: deploy cannot target it')
    await t.exception(teardown(exec, { uri: 'main/notes' }), /notes exists locally/, 'nor teardown')
    await t.exception(teardown(exec, { uri: 'main/nothing' }), /not deployed: nothing/, 'nothing there at all: not deployed')
    const d = await deploy(exec, { uri: 'main/host', args: ['haiccing/target'] })
    await commit()
    const host = join(dir, 'main', 'host')
    t.is(d.deployed, 'host', 'said as it is written at main')
    t.ok(existsSync(join(host, '.git')), 'built inside the parent: main/host/')
    t.alike(Object.keys(d.layers).sort(), ['inbox', 'main', 'packages', 'runtime'], 'the layers of every listed package')
    const child = openRepo(p2pgitBackend(join(host, '.git'), { fs }))
    t.alike(json(await child.read('/runtime/kind.json')), { kind: 'target' }, 'its runtime config: the last package\'s, the one that defines the mrepo')
    t.is(await child.read('/runtime/hooks/boot/base.json').catch(() => null), null, 'runtime config from the last package only: another\'s is not laid in')
    t.ok(await child.read('/runtime/layer.json').then(() => true, () => false), 'the runtime layer itself is structure: from whichever package brings it')
    t.alike(d.packages, ['haiccing/base', 'haiccing/target'], 'its packages, in order')
    t.is(statSync(join(work, 'packages', 'haiccing', 'base.bundle')).ino, statSync(join(host, 'packages', 'haiccing', 'base.bundle')).ino, 'each linked from the store')
    t.alike(json(await repo.read('/xpath/host/shortcut.json')), { mrepo: 'local/host', package: 'haiccing/target', packages: d.packages, layers: d.layers }, 'its shortcut, in the xpath layer: the mrepo linked there (its unique URI, in its parent\'s swarm), what was deployed')
    t.is(await repo.read('/main/host.json').catch(() => null), null, 'nothing of it in main')
    t.alike(json(await child.read('/runtime/mrepo.json')), { uri: 'local/host' }, 'its identity, in its own runtime layer')
    await t.exception(deploy(exec, { uri: 'main/host', args: ['haiccing/target'] }), /deployed already/)

    await t.exception(deploy(exec, { uri: 'main/y', args: ['none'] }), /haiccing\/none.*not in the store nor the sources|not in the store nor the sources.*haiccing\/none/, 'a package named without its organisation: haiccing')
    const r = await redeploy(exec, { uri: 'main/host' })
    await commit()
    t.is(r.tornDown, 'host')
    t.is(r.package, 'haiccing/target', 'redeployed, its type as recorded')

    // a runtime that does not stop (no socket, SIGTERM ignored): teardown ends it all the same
    const stubborn = spawn('sh', ['-c', 'trap "" TERM; while true; do sleep 1; done'], { stdio: 'ignore', detached: true })
    const rec = json(await repo.read('/xpath/host/shortcut.json'))
    exec.put('/xpath/host/shortcut.json', Buffer.from(JSON.stringify({ ...rec, runtime: { pid: stubborn.pid } })))
    await commit()
    const logged = []
    exec.log = (level, event, data) => logged.push({ level, event, ...data })
    t.alike(await teardown(exec, { uri: 'main/host' }), { tornDown: 'host' })
    t.absent(spawnSync('kill', ['-0', String(stubborn.pid)], { stdio: 'ignore' }).status === 0, 'a runtime that would not stop: ended (SIGKILL)')
    t.is(logged.find(e => e.event === 'runtime stopped')?.how, 'SIGKILL', 'and how, logged')
    delete exec.log
    await commit()
    t.absent(existsSync(host), 'removed')
    t.is(await repo.read('/xpath/host/shortcut.json').catch(() => null), null, 'its shortcut out of the xpath layer')
    await t.exception(teardown(exec, { uri: 'main/host' }), /not deployed/)
    await t.exception(deploy(exec, { uri: 'main/x', args: ['haiccing/none'] }), /not in the store nor the sources/)
    await t.exception(deploy(exec, { uri: 'main/../x', args: ['haiccing/target'] }), /not a name for an mrepo/)
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(pkgs, { recursive: true, force: true })
  }
})

// The runtime's bundle as the development repository's sources hold it
// (tools/package-bundle.js); the test skipped without.
// (SOURCES: a sources folder given, as a package's tests pass theirs)
const SOURCES = process.env.SOURCES || join(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '..', '..', '..', 'sources')
const haveRuntime = existsSync(join(SOURCES, 'haiccing', 'base-package-runtime.bundle'))

test('deploy the runtime: the child\'s runtime started from its own packages, its inbox answering; teardown stops it', { timeout: 60000, skip: !haveRuntime }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-rt-'))
  try {
    const dir = await parent(work, [parseSource(`folder:${SOURCES}`)])
    const backend = p2pgitBackend(join(dir, '.git'), { fs })
    const { exec, commit } = context(dir, backend)
    const d = await deploy(exec, { uri: 'main/host', args: ['haiccing/base-package-runtime'] })
    await commit()
    const host = join(dir, 'main', 'host')
    t.ok(d.runtime?.pid, 'its runtime started')
    t.alike([(await ask({ repo: host, op: 'status' }))?.repository.name, (await ask({ repo: host, op: 'status' }))?.repository.uri], ['host', 'local/host'], 'running the child, by its directory; its unique URI its own')
    // a request into its inbox folder (the parent reaches it, forward): answered
    const core = record('/test', ['help/get', '.', 'oneliner'], guid())
    writeFileSync(join(host, 'inbox', `${core.key}.json`), JSON.stringify(wrap('/local/host/inbox', core)))
    const child = openRepo(p2pgitBackend(join(host, '.git'), { fs }))
    let back = null
    for (let i = 0; i < 100 && !back; i++) { back = await child.read(`/outbox/${core.key}.json`).then(json, () => null); if (!back) await new Promise(resolve => setTimeout(resolve, 100)) }
    t.ok(back?.value.value.output?.oneliner, `its inbox operational: its boot hooks run (help activated, extracted), a request answered ${back?.value.value.error ?? ''}`)
    let inFolder = null
    for (let i = 0; i < 50 && !inFolder; i++) { inFolder = existsSync(join(host, 'outbox', `${core.key}.json`)) ? JSON.parse(readFileSync(join(host, 'outbox', `${core.key}.json`))) : null; if (!inFolder) await new Promise(resolve => setTimeout(resolve, 100)) }
    t.alike(inFolder?.value.value, back.value.value, 'and in its outbox folder, as committed (for a subscriber)')
    await teardown(exec, { uri: 'main/host' })
    await commit()
    t.is(await ask({ repo: host, op: 'status' }), null, 'teardown: its runtime stopped')
    t.absent(spawnSync('kill', ['-0', String(d.runtime.pid)], { stdio: 'ignore' }).status === 0, 'its process ended')
    t.absent(existsSync(host), 'and removed')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

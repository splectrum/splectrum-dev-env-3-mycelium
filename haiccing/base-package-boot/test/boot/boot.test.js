// The boot, as the package runs it: bare run.js --work=<folder> (test/boot/run.js
// its entry). Its prerequisites, the boot mrepo built, its packages put in
// place, its request handed over; the runtime not started by it: started
// here, from the boot mrepo's own packages/: it executes its preloaded
// boot deploy /host, the host inside it with its runtime running.
// The sources: SOURCES, else the development repository's sources/ (the
// runtime's bundle written there, the pinned Bare's tarball); what needs them
// skipped without. Everything from the package's own modules/.
import test from '../../modules/node_modules/brittle/index.js'
import process from '../../modules/node_modules/bare-process/index.js'
import { spawn, spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import fs, { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, statSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname, resolve } from '../../modules/node_modules/bare-path/index.js'
import os, { tmpdir } from '../../modules/node_modules/bare-os/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import { openRepo, p2pgitBackend } from '../../modules/pear-full-square/mycelium-git/index.js'
import { record, wrap, guid, layer } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import { ask, gitdirOf, viewOf } from '../../modules/pear-full-square/mrepo-base-runtime/index.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PRELOADED = '7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f'
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const bare = JSON.parse(readFileSync(join(pkg, 'bare.json')))
const SOURCES = resolve(process.env.SOURCES || join(pkg, '..', '..', 'sources'))
const have = existsSync(join(SOURCES, 'holepunchto', `bare-runtime-${os.platform()}-${os.arch()}-${bare.version}.tgz`)) &&
  existsSync(join(SOURCES, 'haiccing', 'base-package-runtime.bundle')) && existsSync(join(SOURCES, 'haiccing', 'base-package-boot.bundle'))

// A run of the boot: its exit code and what it printed (one record a line).
function boot (work, extra) {
  const r = spawnSync(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, lines: r.stdout.toString().split('\n').filter(Boolean).map(l => JSON.parse(l)), err: r.stderr.toString() }
}
// A request posted to the boot's inbox (its folder), its completed form read
// from the outbox.
async function send (work, form) {
  const core = record('/test', { api: 'boot', ...form }, guid())
  writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${core.key}.json`), JSON.stringify(wrap('/boot/inbox', core)))
  const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
  for (let i = 0; i < 100; i++) {
    const back = await repo.read(`/outbox/${core.key}.json`).then(b => JSON.parse(b.toString()), () => null)
    if (back) return back.value.value
    await wait(100)
  }
  return null
}

test('the prerequisites: one missing, the boot stops before writing anything', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-pre-'))
  try {
    const r = boot(work, ['--sources=folder:/nowhere/at/all', '--yes'])
    t.is(r.code, 3, 'a source missing: exit 3')
    const form = r.lines.at(-1).value
    t.alike([form.protocol, form.action, form.uri], ['boot', 'deploy', '/boot'], 'its request printed: boot deploy /boot')
    t.ok(form.command.includes('--sources=folder:/nowhere/at/all'), 'the command as typed')
    t.ok(/^missing: the source folder/.test(form.error), 'completed with what is missing')
    t.absent(existsSync(join(work, 'mrepos')), 'nothing written')
    const empty = mkdtempSync(join(tmpdir(), 'boot-src-'))
    try {
      t.is(boot(work, [`--sources=folder:${empty}`]).code, 3, 'Bare missing, no yes: exit 3')
      t.absent(existsSync(join(work, 'bare')), 'Bare not put in place')
    } finally { rmSync(empty, { recursive: true, force: true }) }
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the boot: put in place up to the runtime; the runtime started from its packages; run again', { timeout: 120000, skip: !have }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    const r = boot(work, [`--sources=folder:${SOURCES}`, '--yes'])
    t.is(r.code, 0, `done ${r.err}`)
    const out = r.lines.at(-1).value.output
    t.alike(out.outcomes.map(o => o.step), ['prerequisites', 'built', 'packages'], 'its outcomes logged in its request')
    t.ok(out.outcomes[0].results.find(c => c.check === 'bare').fixed, 'Bare put in place')
    t.is(readFileSync(join(work, 'bare', 'tarball.sha512'), 'utf8').trim(), bare.integrity, 'as pinned')
    t.absent(existsSync(join(viewOf(work, 'boot'), 'runtime.sock')), 'the runtime not started')

    // the packages: in the store once, hard linked into the boot mrepo
    const store = join(work, 'packages', 'haiccing', 'base-package-runtime.bundle')
    const mine = join(viewOf(work, 'boot'), 'packages', 'haiccing', 'base-package-runtime.bundle')
    t.ok(existsSync(store) && existsSync(mine), 'the runtime\'s bundle: in the store, in the boot mrepo')
    t.is(statSync(store).ino, statSync(mine).ino, 'hard linked: one file')
    const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
    const listed = JSON.parse((await repo.read('/packages/manifest.json')).toString()).packages
    t.alike(Object.keys(listed), ['haiccing/base-package-runtime', 'haiccing/base-package-boot'], 'the packages layer: the list (the runtime, the boot protocol)')
    t.is(listed['haiccing/base-package-runtime'].sha256, out.outcomes[2].packages['haiccing/base-package-runtime'].sha256, 'and the hashes')
    t.absent((await repo.select('/packages/haiccing')).length, 'not the bytes')
    t.ok((await repo.select('/request/execute/*')).some(([p]) => !p.endsWith('layer.json')), 'its request in request/execute')

    // the runtime, as printed (next): from the boot mrepo's own packages, on the Bare put in place
    t.is(out.next, `${join(work, 'bare', 'bin', 'bare')} ${mine} ${viewOf(work, 'boot')}`)
    const child = spawn(join(work, 'bare', 'bin', 'bare'), [mine, viewOf(work, 'boot')], { stdio: 'ignore' })
    let s = null
    for (let i = 0; i < 100 && !s; i++) { s = await ask({ repo: viewOf(work, 'boot'), op: 'status' }); if (!s) await wait(100) }
    t.alike(s?.repository, { name: 'boot', storage: 'filesystem', id: null, key: null }, 'the runtime: running the boot mrepo')
    // its preloaded request: boot deploy /host (the runtime the target): the
    // host inside it, main/host/, its runtime running
    const host = join(viewOf(work, 'boot'), 'main', 'host')
    let h = null
    for (let i = 0; i < 150 && !h; i++) { h = await ask({ repo: host, op: 'status' }); if (!h) await wait(100) }
    t.is(h?.repository.name, 'host', 'the host deployed inside the boot mrepo (main/host), its runtime running')
    t.is(statSync(join(host, 'packages', 'haiccing', 'base-package-runtime.bundle')).ino, statSync(store).ino, 'its runtime linked from the store')
    // (its record merged into main when the action ends, after the host is up)
    let node = null
    for (let i = 0; i < 100 && !node; i++) { node = await repo.read('/main/host.json').then(b => JSON.parse(b.toString()), () => null); if (!node) await wait(100) }
    t.alike([node.package, node.packages], ['haiccing/base-package-runtime', ['haiccing/base-package-runtime']], 'its type recorded at the node')
    // (moved to request/done on the runtime's next pass)
    let history = []
    const backend = p2pgitBackend(gitdirOf(work, 'boot'), { fs })
    for (let i = 0; i < 100 && history.length < 2; i++) {
      history = []
      for (const n of await layer({ repo, backend }, 'request/done').arrived()) history.push((await repo.read(`/request/done/${n}.json`).then(b => JSON.parse(b.toString()))).value.value)
      if (history.length < 2) await wait(100)
    }
    t.alike(history.map(f => `${f.protocol} ${f.action} ${f.uri}`), ['boot deploy /boot', 'boot deploy /host'], 'the history: the boot\'s deploy, then the host\'s')
    t.absent(history[1].error, 'the host\'s deploy done')
    for (const r of [host, viewOf(work, 'boot')]) t.ok((await ask({ repo: r, op: 'stop' }))?.stopping, `stopped: ${r.endsWith('host') ? 'the host' : 'the boot'}`)
    for (let i = 0; i < 100 && (alive(child.pid) || alive(h.pid)); i++) await wait(100)
    t.absent(alive(child.pid) || alive(h.pid), 'both processes ended')

    // run again: already built, the packages unchanged
    const again = boot(work, [`--sources=folder:${SOURCES}`, '--yes'])
    t.is(again.code, 0)
    const o2 = again.lines.at(-1).value.output.outcomes
    t.ok(o2[1].already, 'already built')
    t.is(o2[2].committed, false, 'the packages unchanged: nothing committed')
    const records = async l => (await repo.select(`/request/${l}/*`)).filter(([p]) => !p.endsWith('layer.json')).length
    t.is(await records('execute'), 1, 'run again: its own deploy in request/execute, for its runtime')
    t.is(await records('done'), 2, 'the host\'s deploy not repeated')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

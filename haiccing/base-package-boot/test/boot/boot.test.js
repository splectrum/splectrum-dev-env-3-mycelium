// The boot, as the package runs it: bare run.js --work=<folder> (test/boot/run.js
// its entry). Its prerequisites, the boot mrepo built, its packages put in
// place, its request handed over, its runtime started (from its own
// packages/): it executes its preloaded boot deploy /host, the host inside
// it with its runtime running.
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
import { record, wrap, guid, layer, follow } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import { ask, gitdirOf, viewOf } from '../../modules/pear-full-square/mrepo-base-runtime/index.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PRELOADED = '7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f'
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const bare = JSON.parse(readFileSync(join(pkg, 'bare.json')))
const SOURCES = resolve(process.env.SOURCES || join(pkg, '..', '..', 'sources'))
const have = existsSync(join(SOURCES, 'holepunchto', `bare-runtime-${os.platform()}-${os.arch()}-${bare.version}.tgz`)) &&
  ['base-package-runtime', 'base-package-boot', 'package-docs-mrepo', 'package-docs-template'].every(p => existsSync(join(SOURCES, 'haiccing', `${p}.bundle`)))

// The PATH without any `bare` on it: the machine's own Bare not found.
const NO_BARE = String(process.env.PATH ?? '').split(':').filter(d => d && !existsSync(join(d, 'bare'))).join(':')
// A run of the boot: its exit code and what it printed (one record a line);
// its PATH NO_BARE unless given.
function boot (work, extra, path = NO_BARE) {
  const r = spawnSync(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: path } })
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

test('the boot: put in place, its runtime started, the host deployed inside it; redeployed, torn down, deployed again by requests; run again', { timeout: 240000, skip: !have }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    const r = boot(work, [`--sources=folder:${SOURCES}`, '--yes'])
    t.is(r.code, 0, `done ${r.err}`)
    const out = r.lines.find(l => l.value).value.output
    const logged = r.lines.find(l => l.value).value.log
    const started = r.lines.at(-1).runtime
    t.is(started?.repository, 'boot', 'its runtime started by the boot (its status printed last)')
    t.alike(logged.map(e => [e.level, e.event]), [['info', 'prerequisites'], ['info', 'built'], ['info', 'packages']], 'its steps logged in its request, with their level')
    t.ok(logged[0].results.find(c => c.check === 'bare').fixed, 'Bare put in place')
    t.is(readFileSync(join(work, 'bare', 'tarball.sha512'), 'utf8').trim(), bare.integrity, 'as pinned')

    // the packages: in the store once, hard linked into the boot mrepo
    const store = join(work, 'packages', 'haiccing', 'base-package-runtime.bundle')
    const mine = join(viewOf(work, 'boot'), 'packages', 'haiccing', 'base-package-runtime.bundle')
    t.ok(existsSync(store) && existsSync(mine), 'the runtime\'s bundle: in the store, in the boot mrepo')
    t.is(statSync(store).ino, statSync(mine).ino, 'hard linked: one file')
    const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
    const listed = JSON.parse((await repo.read('/packages/manifest.json')).toString()).packages
    t.alike(Object.keys(listed), ['haiccing/base-package-runtime', 'haiccing/base-package-boot', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template'], 'the packages layer: the list (the runtime, the boot protocol, the documentation packages)')
    t.is(listed['haiccing/base-package-runtime'].sha256, logged[2].packages['haiccing/base-package-runtime'].sha256, 'and the hashes')
    t.absent((await repo.select('/packages/haiccing')).length, 'not the bytes')
    // the runtime: from the boot mrepo's own packages, on the Bare put in place
    t.is(out.runtime, `${join(work, 'bare', 'bin', 'bare')} ${mine} ${viewOf(work, 'boot')}`, 'its command recorded')
    const s = await ask({ repo: viewOf(work, 'boot'), op: 'status' })
    t.alike(s?.repository, { name: 'boot', storage: 'filesystem', id: null, key: null }, 'running the boot mrepo')
    const child = { pid: s.pid }
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
    t.alike([node.package, node.packages], ['haiccing/base-package-runtime', ['haiccing/base-package-runtime', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template']], 'its type recorded at the node, the packages it is made of')
    // (moved to request/done on the runtime's next pass)
    let history = []
    const backend = p2pgitBackend(gitdirOf(work, 'boot'), { fs })
    for (let i = 0; i < 300 && history.length < 3; i++) {
      history = []
      for (const n of await layer({ repo, backend }, 'request/done').arrived()) history.push((await repo.read(`/request/done/${n}.json`).then(b => JSON.parse(b.toString()))).value.value)
      if (history.length < 3) await wait(100)
    }
    t.alike(history.map(f => `${f.protocol} ${f.action} ${f.uri}`), ['boot deploy /boot', 'boot deploy /host', 'help extract /'], 'the history: the boot\'s deploy, the host\'s (preloaded), its help extracted (placed by its runtime as it started)')
    t.alike(await repo.select('/inbox/*').then(r => r.filter(([p]) => !p.endsWith('layer.json')).length, () => 0), 0, 'all three internal: none of them in the inbox')
    t.absent(history[1].error, 'the host\'s deploy done')
    t.ok(!history[2].error && history[2].output?.readmes > 0, `its help extracted before it took requests in ${JSON.stringify(history[2].output ?? history[2].error)}`)
    // followed: every record of the boot mrepo's request layers and its child's, one line each
    const lines = []
    const f = follow({ dir: viewOf(work, 'boot'), name: 'boot', print: l => lines.push(l) })
    await f.pass()
    f.stop()
    t.ok(lines.every(l => !l.includes('\n') && JSON.parse(l).key), 'one compact record a line')
    const topics = lines.map(l => JSON.parse(l).topic)
    t.ok(topics.includes('/boot/request/done'), 'the boot mrepo\'s, its topic the full path')
    t.ok(topics.every(x => x.startsWith('/boot/')), 'from the root')
    // redeploy, sent to the running boot mrepo through its inbox folder: the
    // host's runtime stopped, the host rebuilt, its runtime started again
    const core = record('/test', { api: 'boot', protocol: 'boot', action: 'redeploy', uri: '/host' }, guid())
    writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${core.key}.json`), JSON.stringify(wrap('/boot/inbox', core)))
    let redone = null
    for (let i = 0; i < 300 && !redone; i++) { redone = await repo.read(`/request/done/${core.key}.json`).then(b => JSON.parse(b.toString()).value.value, () => null); if (!redone) await wait(100) }
    t.ok(redone, 'boot redeploy /host: done')
    t.absent(redone?.error, `without an error ${redone?.error ?? ''}`)
    t.alike([redone?.output.tornDown, redone?.output.deployed, redone?.output.package], ['/host', '/host', 'haiccing/base-package-runtime'], 'torn down and deployed again, its type as recorded')
    t.ok(redone?.log?.some(e => e.event === 'runtime stopped' && e.pid === h.pid), `the old runtime stopped, how logged: ${redone?.log?.find(e => e.event === 'runtime stopped')?.how}`)
    t.absent(alive(h.pid), 'the old host runtime\'s process ended')
    const h2 = await ask({ repo: host, op: 'status' })
    t.ok(h2 && h2.pid !== h.pid, 'a new host runtime running')
    let node2 = null
    for (let i = 0; i < 100 && node2?.runtime?.pid !== h2?.pid; i++) { node2 = await repo.read('/main/host.json').then(b => JSON.parse(b.toString()), () => null); if (node2?.runtime?.pid !== h2?.pid) await wait(100) }
    t.is(node2?.runtime?.pid, h2?.pid, 'its record at the node updated')

    // teardown, then deploy again, each a request to the running boot mrepo
    // (the child the runtime package alone)
    const sent = async (form, tries = 300) => {
      const c = record('/test', { api: 'boot', protocol: 'boot', ...form }, guid())
      writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${c.key}.json`), JSON.stringify(wrap('/boot/inbox', c)))
      let v = null
      for (let i = 0; i < tries && !v; i++) { v = await repo.read(`/request/done/${c.key}.json`).then(b => JSON.parse(b.toString()).value.value, () => null); if (!v) await wait(100) }
      return v
    }
    const down = await sent({ action: 'teardown', uri: '/host' })
    t.alike([down?.error, down?.output], [undefined, { tornDown: '/host' }], 'boot teardown /host: done')
    t.absent(alive(h2.pid), 'the host\'s runtime ended')
    t.absent(existsSync(host), 'main/host removed')
    let gone = false
    for (let i = 0; i < 100 && !gone; i++) { gone = (await repo.read('/main/host.json').catch(() => null)) === null; if (!gone) await wait(100) }
    t.ok(gone, 'its record out of main')
    const up = await sent({ action: 'deploy', uri: '/host', body: { package: 'haiccing/base-package-runtime' } })
    t.absent(up?.error, `boot deploy /host again: done ${up?.error ?? ''}`)
    const h3 = await ask({ repo: host, op: 'status' })
    t.ok(h3 && h3.pid !== h2.pid, 'the host back, a new runtime running')

    // the runtime protocol, built in: a linked package's tests, through its
    // dispatcher; a dry run says what would run, a run returns the results
    const dry = await sent({ protocol: 'runtime', action: 'run', uri: '/packages/haiccing/base-package-runtime/test/full', body: { dryRun: true } })
    const runs = dry?.output?.runs ?? []
    t.ok(!dry?.error && runs.slice(0, 3).join() === '/test/start,/test/help,/test/code' && runs.length > 3 && runs.slice(3).every(u => u.startsWith('/test/modules/')), `runtime run, a dry run: what test/full would run, nothing run ${JSON.stringify(dry?.output ?? dry?.error)}`)
    const ran = await sent({ protocol: 'runtime', action: 'run', uri: '/packages/haiccing/base-package-runtime/test/validate' }, 1200)
    t.absent(ran?.error, `runtime run test/validate: done ${ran?.error ?? ''}`)
    t.alike([ran?.output?.ok, ran?.output?.units?.map(u => u.unit)], [true, ['/test/start', '/test/help', '/test/code']], 'its result: the start test, its help and its code passed, in a floating instance')
    t.ok(ran?.log?.some(e => e.event === 'unit' && e.unit === '/test/start' && e.ok), 'a summary logged, a line a unit')
    // its help, extracted by its runtime as it started: retrieved by URI
    const root = await sent({ protocol: 'help', action: 'get', uri: '/' })
    t.ok(!root?.error && root?.output?.oneliner && root.output.links.some(l => l.uri === '/packages'), `help get /: the mrepo's, its links with their one-liners ${root?.error ?? ''}`)
    const pk = await sent({ protocol: 'help', action: 'get', uri: '/packages', body: { level: 'oneliner' } })
    t.alike(['haiccing/base-package-runtime', 'haiccing/base-package-boot', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template'].map(p => pk?.output?.links?.some(l => l.uri === `/packages/${p}`)), [true, true, true, true], 'help get /packages: each package it links')
    const tb = await sent({ protocol: 'help', action: 'get', uri: '/packages/haiccing/base-package-boot/test/boot', body: { level: 'detail' } })
    t.ok(!tb?.error && tb?.output?.title === 'boot/' && tb.output.summary, `help get on this very test: its README ${tb?.error ?? ''}`)
    const hostHelp = await openRepo(p2pgitBackend(join(host, '.git'), { fs })).read('/help/index.json').then(b => JSON.parse(b.toString()), () => null)
    t.ok(hostHelp?.['/packages/haiccing/base-package-runtime'], 'the host\'s help: extracted by its own runtime, from its own packages')
    // each package checks, in situ, what this mrepo's runtime made of its help
    for (const p of ['base-package-boot', 'base-package-runtime', 'package-docs-mrepo', 'package-docs-template']) {
      const v = await sent({ protocol: 'runtime', action: 'run', uri: `/packages/haiccing/${p}/test/validate-in-situ` }, 1200)
      t.alike([v?.error, v?.output?.ok, v?.output?.units?.[0]?.asserts], [undefined, true, { passed: 3, total: 3 }], `${p}: validate-in-situ, its help in this mrepo ${v?.error ?? JSON.stringify(v?.output?.units?.[0]?.failures ?? '')}`)
    }
    const refused = await sent({ protocol: 'runtime', action: 'run', uri: '/packages/haiccing/base-package-runtime/run' })
    t.ok(/not run here/.test(refused?.error ?? ''), 'a package\'s program: not run in the runtime')

    for (const r of [viewOf(work, 'boot'), host]) t.ok((await ask({ repo: r, op: 'stop' }))?.stopping, `stopped: ${r.endsWith('host') ? 'the host' : 'the boot'}`)
    for (let i = 0; i < 100 && (alive(child.pid) || alive(h3.pid)); i++) await wait(100)
    t.absent(alive(child.pid) || alive(h3.pid), 'both processes ended')

    // run again: already built, the packages unchanged; its runtime started again
    const again = boot(work, [`--sources=folder:${SOURCES}`, '--yes'])
    t.is(again.code, 0)
    const o2 = again.lines.find(l => l.value).value.log
    t.ok(o2[1].already, 'already built')
    t.is(o2[2].committed, false, 'the packages unchanged: nothing committed')
    const records = async l => (await repo.select(`/request/${l}/*`)).filter(([p]) => !p.endsWith('layer.json')).length
    let n = 0
    for (let i = 0; i < 100 && (n = await records('done')) < 18; i++) await wait(100)
    t.is(n, 18, 'its runtime again: the second deploy done; the host\'s preloaded deploy not repeated (the redeploy, teardown, deploy, the three runtime runs, the three helps, the four in-situ validations, the two help extractions (internal, one a start) among them)')
    t.ok(await ask({ repo: host, op: 'status' }) === null, 'the host not redeployed, nor started (its runtime stopped above)')
    const s2 = await ask({ repo: viewOf(work, 'boot'), op: 'status' })
    t.ok((await ask({ repo: viewOf(work, 'boot'), op: 'stop' }))?.stopping, 'stopped again')
    for (let i = 0; i < 100 && alive(s2.pid); i++) await wait(100)
    t.absent(alive(s2.pid))
  } finally {
    // whatever happened: its runtimes stopped (the host's, the boot's), then its folder removed
    for (const r of [join(viewOf(work, 'boot'), 'main', 'host'), viewOf(work, 'boot')]) {
      const s = await ask({ repo: r, op: 'status' }).catch(() => null)
      if (s?.pid) { try { os.kill(s.pid, 'SIGTERM') } catch {} for (let i = 0; i < 50 && alive(s.pid); i++) await wait(100) }
    }
    rmSync(work, { recursive: true, force: true })
  }
})

test('an installed Bare on the PATH: used, recorded, none put in place, no question', { timeout: 120000, skip: !have }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-inst-'))
  const bin = mkdtempSync(join(tmpdir(), 'boot-bin-'))
  try {
    // the Bare running this test, installed as `bare` (the pinned version, or newer)
    fs.symlinkSync(os.execPath(), join(bin, 'bare'))
    const r = boot(work, [`--sources=folder:${SOURCES}`], [bin, NO_BARE].join(':'))
    t.is(r.code, 0, `done without --yes ${r.err}`)
    const out = r.lines.find(l => l.value).value.output
    const b = r.lines.find(l => l.value).value.log[0].results.find(c => c.check === 'bare')
    t.ok(b.value.installed && !b.fixed, 'the installed one: used')
    t.is(b.value.bare, join(bin, 'bare'))
    t.absent(existsSync(join(work, 'bare')), 'no Bare put in place')
    t.is(JSON.parse(readFileSync(join(work, 'bare.json'))).bare, join(bin, 'bare'), 'recorded in the work folder')
    t.ok(out.runtime.startsWith(`${join(bin, 'bare')} `), 'its runtime started on it')
    t.is(boot(work, [`--sources=folder:${SOURCES}`]).code, 0, 'run again: the recorded one, without it on the PATH')
  } finally {
    // the runtimes the boot started: the boot's first (its stop waits for a
    // deploy in progress, which starts the host), then the host's; waited for
    for (const r of [viewOf(work, 'boot'), join(viewOf(work, 'boot'), 'main', 'host')]) {
      const s = await ask({ repo: r, op: 'status' })
      if (!s) continue
      await ask({ repo: r, op: 'stop' })
      for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
    }
    rmSync(work, { recursive: true, force: true })
    rmSync(bin, { recursive: true, force: true })
  }
})

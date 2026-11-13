// The boot, as the package runs it: bare run.js --work=<folder> (test/boot/run.js
// its entry). The boot mrepo built, its packages put in place, its request
// handed over, its runtime started (from its own packages/). Nothing is
// deployed by it: the host is deployed by a command, and from there on
// everything is a command sent to the boot mrepo's inbox.
// The sources: SOURCES, else the development repository's sources/ (the
// packages' bundles written there); what needs them skipped without.
// Everything from the package's own modules/.
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
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const SOURCES = resolve(process.env.SOURCES || join(pkg, '..', '..', 'sources'))
const have = ['base-package-runtime', 'base-package-boot', 'base-package-service', 'base-package-haicc', 'base-component-haicc', 'package-docs-mrepo', 'package-docs-template'].every(p => existsSync(join(SOURCES, 'haiccing', `${p}.bundle`)))

// A run of the boot, on the Bare running this test: its exit code and what
// it printed (one record a line).
function boot (work, extra) {
  const r = spawnSync(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, lines: r.stdout.toString().split('\n').filter(Boolean).map(l => JSON.parse(l)), err: r.stderr.toString() }
}
test('the sources missing: the boot says so, its request printed, exit 1', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-pre-'))
  try {
    const r = boot(work, ['--sources=folder:/nowhere/at/all'])
    t.is(r.code, 1, 'exit 1')
    const form = r.lines.at(-1).value
    t.alike([form.protocol, form.action, form.uri], ['boot', 'deploy', '/boot'], 'its request printed: boot deploy /boot')
    t.ok(form.command.includes('--sources=folder:/nowhere/at/all'), 'the command as typed')
    t.ok(form.error, `completed with the error: ${form.error}`)
    t.is(await ask({ repo: viewOf(work, 'boot'), op: 'status' }), null, 'no runtime started')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the boot: put in place, its runtime started, nothing deployed; the host deployed, redeployed, torn down, deployed again by commands; haicc; run again', { timeout: 240000, skip: !have }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    const r = boot(work, [`--sources=folder:${SOURCES}`])
    t.is(r.code, 0, `done ${r.err}`)
    const out = r.lines.find(l => l.value).value.output
    const logged = r.lines.find(l => l.value).value.log
    const started = r.lines.at(-1).runtime
    t.is(started?.repository, 'boot', 'its runtime started by the boot (its status printed last)')
    t.alike(logged.map(e => [e.level, e.event]), [['info', 'built'], ['info', 'packages']], 'its steps logged in its request, with their level')
    t.absent(existsSync(join(work, 'bare')), 'no Bare put in place: the one running it is used')

    // the packages: in the store once, hard linked into the boot mrepo
    const store = join(work, 'packages', 'haiccing', 'base-package-runtime.bundle')
    const mine = join(viewOf(work, 'boot'), 'packages', 'haiccing', 'base-package-runtime.bundle')
    t.ok(existsSync(store) && existsSync(mine), 'the runtime\'s bundle: in the store, in the boot mrepo')
    t.is(statSync(store).ino, statSync(mine).ino, 'hard linked: one file')
    const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
    const listed = JSON.parse((await repo.read('/packages/manifest.json')).toString()).packages
    t.alike(Object.keys(listed), ['haiccing/base-package-runtime', 'haiccing/base-package-boot', 'haiccing/base-package-haicc', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template'], 'the packages layer: the list (the runtime, the boot protocol, the haicc protocol, the documentation packages)')
    t.is(listed['haiccing/base-package-runtime'].sha256, logged[1].packages['haiccing/base-package-runtime'].sha256, 'and the hashes')
    t.absent((await repo.select('/packages/haiccing')).length, 'not the bytes')
    // the runtime: from the boot mrepo's own packages, on the Bare that ran the boot
    t.is(out.runtime, `${os.execPath()} ${mine} ${viewOf(work, 'boot')}`, 'its command recorded')
    const s = await ask({ repo: viewOf(work, 'boot'), op: 'status' })
    t.alike(s?.repository, { name: 'boot', uri: 'local/boot', storage: 'filesystem', id: null, key: null }, 'running the boot mrepo, its unique URI local/boot')
    const child = { pid: s.pid }
    // a command as typed, its parts, into the boot mrepo's inbox folder; its
    // completed form read from request/done
    const typed = async (parts, tries = 300) => {
      const c = record('/test', parts, guid())
      writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${c.key}.json`), JSON.stringify(wrap('/local/boot/inbox', c)))
      let v = null
      for (let i = 0; i < tries && !v; i++) { v = await repo.read(`/request/done/${c.key}.json`).then(b => JSON.parse(b.toString()).value.value, () => null); if (!v) await wait(100) }
      return v
    }
    // nothing deployed by the boot: no host, nothing pending
    const host = join(viewOf(work, 'boot'), 'main', 'host')
    t.absent(existsSync(host), 'nothing deployed by the boot: no host yet')
    // the host deployed by a command at the root, the name joined to the
    // position: boot/deploy /host (the runtime the target)
    const first = await typed(['boot/deploy', 'host', 'haiccing/base-package-runtime'])
    t.alike([first?.error, first?.uri, first?.output?.deployed, first?.output?.mrepo], [undefined, '/host', '/host', 'local/host'], `boot/deploy host: done ${first?.error ?? ''}`)
    const h = await ask({ repo: host, op: 'status' })
    t.is(h?.repository.name, 'host', 'the host deployed inside the boot mrepo (main/host), its runtime running')
    t.is(statSync(join(host, 'packages', 'haiccing', 'base-package-runtime.bundle')).ino, statSync(store).ino, 'its runtime linked from the store')
    // (its shortcut merged into the xpath layer when the action ends, after the host is up)
    let node = null
    for (let i = 0; i < 100 && !node; i++) { node = await repo.read('/xpath/host/shortcut.json').then(b => JSON.parse(b.toString()), () => null); if (!node) await wait(100) }
    t.alike([node.mrepo, node.package, node.packages], ['local/host', 'haiccing/base-package-runtime', ['haiccing/base-package-runtime', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template']], 'its shortcut: the mrepo linked there by its unique URI, what was deployed, the packages it is made of')
    t.is(await repo.read('/main/host.json').catch(() => null), null, 'no presence in main')
    t.is(h?.repository.uri, 'local/host', 'the host knows its own unique URI')
    // (moved to request/done on the runtime's next pass)
    let history = []
    const backend = p2pgitBackend(gitdirOf(work, 'boot'), { fs })
    for (let i = 0; i < 300 && history.length < 4; i++) {
      history = []
      for (const n of await layer({ repo, backend }, 'request/done').arrived()) history.push((await repo.read(`/request/done/${n}.json`).then(b => JSON.parse(b.toString()))).value.value)
      if (history.length < 4) await wait(100)
    }
    t.alike(history.map(f => `${f.protocol} ${f.action} ${f.uri}`), ['boot deploy /boot', 'runtime register /', 'help extract /', 'boot deploy /host'], 'the history: the boot\'s deploy, then its runtime\'s own as it started (its protocols registered, its help extracted), then the first command')
    t.alike(await repo.select('/inbox/*').then(r => r.filter(([p]) => !p.endsWith('layer.json')).length, () => 0), 1, 'the first three internal: only the command in the inbox')
    t.alike(history[1].output, { registered: ['boot', 'haicc', 'help', 'runtime'] }, 'its protocols: the boot\'s, haicc, and the runtime package\'s two')
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
    const core = record('/test', { protocol: 'boot', action: 'redeploy', uri: '/host' }, guid())
    writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${core.key}.json`), JSON.stringify(wrap('/local/boot/inbox', core)))
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
    for (let i = 0; i < 100 && node2?.runtime?.pid !== h2?.pid; i++) { node2 = await repo.read('/xpath/host/shortcut.json').then(b => JSON.parse(b.toString()), () => null); if (node2?.runtime?.pid !== h2?.pid) await wait(100) }
    t.is(node2?.runtime?.pid, h2?.pid, 'its shortcut updated')

    // teardown, then deploy again, each a request to the running boot mrepo
    // (the child the runtime package alone)
    const sent = async (form, tries = 300) => {
      const c = record('/test', { protocol: 'boot', ...form }, guid())
      writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${c.key}.json`), JSON.stringify(wrap('/local/boot/inbox', c)))
      let v = null
      for (let i = 0; i < tries && !v; i++) { v = await repo.read(`/request/done/${c.key}.json`).then(b => JSON.parse(b.toString()).value.value, () => null); if (!v) await wait(100) }
      return v
    }
    const down = await sent({ action: 'teardown', uri: '/host' })
    t.alike([down?.error, down?.output], [undefined, { tornDown: '/host' }], 'boot teardown /host: done')
    t.absent(alive(h2.pid), 'the host\'s runtime ended')
    t.absent(existsSync(host), 'main/host removed')
    let gone = false
    for (let i = 0; i < 100 && !gone; i++) { gone = (await repo.read('/xpath/host/shortcut.json').catch(() => null)) === null; if (!gone) await wait(100) }
    t.ok(gone, 'its shortcut out of the xpath layer')
    const up = await sent({ action: 'deploy', uri: '/host', args: ['haiccing/base-package-runtime'] })
    t.absent(up?.error, `boot deploy /host again: done ${up?.error ?? ''}`)
    const h3 = await ask({ repo: host, op: 'status' })
    t.ok(h3 && h3.pid !== h2.pid, 'the host back, a new runtime running')

    // haicc: go to a node position and execute the command that follows. A
    // command as typed, its parts; at a shortcut it is sent on to the mrepo
    // linked there, unchanged; the request waits, the response its result
    const far = await typed(['haicc', '/host', 'help/get', '/packages', 'oneliner'])
    t.alike([far?.error, far?.protocol, far?.action, far?.uri, far?.args], [undefined, 'haicc', 'goto', '/host', ['help/get', '/packages', 'oneliner']], `haicc /host help/get /packages oneliner: haicc alone is haicc/goto, what follows its arguments ${far?.error ?? ''}`)
    t.alike([far?.output?.uri, far?.remote?.at, far?.remote?.folder, typeof far?.remote?.key], ['/packages', '/host', 'main/host', 'string'], 'answered by the host: /host is a shortcut, the command sent on')
    const hostRepo = openRepo(p2pgitBackend(join(host, '.git'), { fs }))
    const passed = await hostRepo.read(`/request/done/${far?.remote?.key}.json`).then(b => JSON.parse(b.toString()).value, () => null)
    t.alike([/^\/local\/boot\/execute\/[0-9a-f-]{36}$/.test(passed?.topic ?? ''), passed?.value?.command, passed?.value?.protocol, passed?.value?.uri], [true, ['help/get', '/packages', 'oneliner'], 'help', '/packages'], 'in the host: the command that followed, unchanged (the hop taken off, nothing rewritten), addressed back to the waiting request\'s branch')
    let kept = null // moved to done right after its principal, in the same pass
    for (let i = 0; i < 50 && !kept; i++) { kept = await repo.read(`/request/done/${far?.remote?.key}.json`).then(b => JSON.parse(b.toString()).value, () => null); if (!kept) await wait(100) }
    t.alike([kept?.value?.uri, 'output' in (kept?.value ?? {})], ['/packages', true], 'the host\'s response, merged in with its principal: kept in done')
    t.absent(await repo.read(`/outbox/${far?.remote?.key}.json`).then(() => true, () => false), 'and not sent on')
    const near = await typed(['haicc', '/', 'help/get', '/packages', 'oneliner'])
    t.alike([near?.error, near?.remote], [undefined, undefined], `haicc / help/get: the root, executed here ${near?.error ?? ''}`)
    t.alike(far?.output?.links?.map(l => l.uri).filter(u => u.includes('base-package-boot')), [], 'the host\'s packages, not the boot mrepo\'s (it does not link the boot)')
    t.ok(near?.output?.links?.some(l => l.uri.includes('base-package-boot')), 'the boot mrepo\'s own do')
    t.alike((await p2pgitBackend(gitdirOf(work, 'boot'), { fs }).listBranches()).map(([b]) => b).filter(b => b.startsWith('execute/')), [], 'no request branch left: the principal\'s removed once it was returned')
    t.ok(/\/host is a shortcut: a URI does not run through it/.test((await typed(['haicc', '/host/packages', 'help/get']))?.error ?? ''), 'a URI running through a shortcut: not resolved; the way across is a haicc at the shortcut')
    t.ok(/a position inside main is not built yet/.test((await typed(['haicc', '/nowhere', 'help/get']))?.error ?? ''), 'a position inside main: not built yet')
    t.is((await typed(['haicc', '/host', 'haicc', '/', 'help/get']))?.error, 'no action: haicc (haicc has no default action)', 'chained: the second haicc is the host\'s to execute, and this host does not link the haicc protocol: its error returned')
    t.is((await typed(['boot/deploy', 'host', 'haiccing/base-package-runtime']))?.error, 'deployed already: /host', 'a plain command at the root, the name joined to the position: boot/deploy /host')
    // the runtime protocol, built in: a linked package's tests, through its
    // dispatcher; a dry run says what would run, a run returns the results
    const dry = await sent({ protocol: 'runtime', action: 'run', uri: '/packages/haiccing/base-package-runtime/test/full', args: ['dry-run'] })
    const runs = dry?.output?.runs ?? []
    t.ok(!dry?.error && runs.slice(0, 4).join() === '/test/start,/test/help,/test/code,/test/mrepo' && runs.length > 4 && runs.slice(4).every(u => u.startsWith('/test/modules/')), `runtime run, a dry run: what test/full would run, nothing run ${JSON.stringify(dry?.output ?? dry?.error)}`)
    const ran = await sent({ protocol: 'runtime', action: 'run', uri: '/packages/haiccing/base-package-runtime/test/validate' }, 1200)
    t.absent(ran?.error, `runtime run test/validate: done ${ran?.error ?? ''}`)
    t.alike([ran?.output?.ok, ran?.output?.units?.map(u => u.unit)], [true, ['/test/start', '/test/help', '/test/code', '/test/mrepo']], 'its result: the start test, its help, its code and its mrepo side passed, in a floating instance')
    t.ok(ran?.log?.some(e => e.event === 'unit' && e.unit === '/test/start' && e.ok), 'a summary logged, a line a unit')
    // its help, extracted by its runtime as it started: retrieved by URI
    const root = await sent({ protocol: 'help', action: 'get', uri: '/' })
    t.ok(!root?.error && root?.output?.oneliner && root.output.links.some(l => l.uri === '/packages'), `help get /: the mrepo's, its links with their one-liners ${root?.error ?? ''}`)
    const pk = await sent({ protocol: 'help', action: 'get', uri: '/packages', args: ['oneliner'] })
    t.alike(['haiccing/base-package-runtime', 'haiccing/base-package-boot', 'haiccing/base-package-haicc', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template'].map(p => pk?.output?.links?.some(l => l.uri === `/packages/${p}`)), [true, true, true, true, true], 'help get /packages: each package it links')
    const tb = await sent({ protocol: 'help', action: 'get', uri: '/packages/haiccing/base-package-boot/test/boot', args: ['detail'] })
    t.ok(!tb?.error && tb?.output?.title === 'boot/' && tb.output.summary, `help get on this very test: its README ${tb?.error ?? ''}`)
    const hostHelp = await openRepo(p2pgitBackend(join(host, '.git'), { fs })).read('/help/index.json').then(b => JSON.parse(b.toString()), () => null)
    t.ok(hostHelp?.['/packages/haiccing/base-package-runtime'], 'the host\'s help: extracted by its own runtime, from its own packages')
    // each package checks, in situ, what this mrepo's runtime made of its help
    for (const p of ['base-package-boot', 'base-package-runtime', 'base-package-haicc', 'package-docs-mrepo', 'package-docs-template']) {
      const v = await sent({ protocol: 'runtime', action: 'run', uri: `/packages/haiccing/${p}/test/validate-in-situ` }, 1200)
      t.alike([v?.error, v?.output?.ok, v?.output?.units?.map(u => [u.unit, u.asserts.passed > 0 && u.asserts.passed === u.asserts.total])], [undefined, true, [['/test/help-in-situ', true], ['/test/mrepo-in-situ', true]]], `${p}: validate-in-situ, its help and itself as this mrepo holds it ${v?.error ?? JSON.stringify(v?.output?.units?.map(u => u.failures) ?? '')}`)
    }
    // an mrepo with a service, deployed from the service package: its
    // external API gated by its state, its protocols recorded
    const svcUp = await sent({ action: 'deploy', uri: '/svc', args: ['haiccing/base-package-service'] }, 600)
    t.absent(svcUp?.error, `boot deploy /svc from the service package ${svcUp?.error ?? ''}`)
    const svc = join(viewOf(work, 'boot'), 'main', 'svc')
    const svcRepo = openRepo(p2pgitBackend(join(svc, '.git'), { fs }))
    const toSvc = async (form, tries = 600) => {
      const c = record('/test', form, guid())
      writeFileSync(join(svc, 'inbox', `${c.key}.json`), JSON.stringify(wrap('/local/svc/inbox', c)))
      let v = null
      for (let i = 0; i < tries && !v; i++) { v = await svcRepo.read(`/outbox/${c.key}.json`).then(b => JSON.parse(b.toString()).value.value, () => null); if (!v) await wait(100) }
      return v
    }
    const svcReq = (protocol, action, uri, args) => toSvc({ protocol, action, uri, ...(args ? { args } : {}) })
    t.ok((await svcReq('help', 'get', '/'))?.output?.oneliner, 'booted: help not behind the service\'s door, answered (once its own requests were done)')
    t.is(JSON.parse((await svcRepo.read('/runtime/service.json')).toString()).state, 'booted', 'its state, from the service package\'s structure')
    t.alike((await svcRepo.select('/protocols/*')).map(([p]) => p.slice(p.lastIndexOf('/') + 1)).filter(n => n !== 'layer.json').sort(), ['help.json', 'runtime.json', 'service.json'], 'its protocols recorded: the runtime\'s, help, service')
    t.is((await svcReq('service', 'start', '/'))?.error, 'not now: service start (the service is booted)', 'the service\'s own actions: each in its state')
    t.alike((await svcReq('service', 'initialise', '/'))?.output, { service: 'initialised' })
    t.alike((await svcReq('service', 'start', '/'))?.output, { service: 'started' })
    t.is((await svcReq('rest', 'get', '/main'))?.error, 'not offered: rest', 'a protocol it does not link: not offered')
    t.is((await svcReq('service', 'start', '/main'))?.error, 'not offered: service start at /main', 'an action, only at the URIs its config names')
    const svcSitu = await svcReq('runtime', 'run', '/packages/haiccing/base-package-service/test/validate-in-situ')
    t.alike([svcSitu?.error, svcSitu?.output?.ok, svcSitu?.output?.units?.map(u => u.unit)], [undefined, true, ['/test/help-in-situ', '/test/mrepo-in-situ']], `the service package validated in situ, in the mrepo it serves ${svcSitu?.error ?? JSON.stringify(svcSitu?.output?.units?.map(u => u.failures) ?? '')}`)
    const svcDown = await sent({ action: 'teardown', uri: '/svc' })
    t.alike([svcDown?.error, svcDown?.output], [undefined, { tornDown: '/svc' }], 'torn down again')
    // the haicc component: the mrepo a host is managed with, deployed by a
    // command (the package named without its organisation: haiccing); service
    // managed, its boot protocol behind the door; a node deployed inside it,
    // commands chained through both shortcuts
    const comp = await typed(['boot/deploy', 'haicc', 'base-component-haicc'], 900)
    t.alike([comp?.error, comp?.output?.package, comp?.output?.mrepo], [undefined, 'haiccing/base-component-haicc', 'local/haicc'], `boot/deploy haicc base-component-haicc ${comp?.error ?? ''}`)
    const hc = join(viewOf(work, 'boot'), 'main', 'haicc')
    const hcRepo = openRepo(p2pgitBackend(join(hc, '.git'), { fs }))
    t.alike(JSON.parse((await hcRepo.read('/packages/layer.json')).toString()).packages, comp?.output?.packages, 'its packages layer: the component\'s own list (laid in last)')
    t.alike((await hcRepo.select('/main/*')).map(([p]) => p), ['/main/layer.json'], 'its main empty')
    t.is((await typed(['haicc', '/haicc', 'boot/deploy', 'node-1', 'base-package-runtime']))?.error, 'not now: boot deploy (the service is booted, not started)', 'booted: its boot protocol behind the service\'s door')
    t.alike((await typed(['haicc', '/haicc', 'service/initialise']))?.output, { service: 'initialised' }, 'haicc /haicc service/initialise: passed through to it')
    t.alike((await typed(['haicc', '/haicc', 'service/start']))?.output, { service: 'started' }, 'haicc /haicc service/start')
    t.alike((await hcRepo.select('/protocols/*')).map(([p]) => p.slice(p.lastIndexOf('/') + 1)).filter(n => n !== 'layer.json').sort(), ['boot.json', 'haicc.json', 'help.json', 'runtime.json', 'service.json'], 'its protocols: boot, haicc, service, and the runtime package\'s two')
    const nodeUp = await typed(['haicc', '/haicc', 'boot/deploy', 'node-1', 'base-package-runtime'], 900)
    t.alike([nodeUp?.error, nodeUp?.output?.deployed, nodeUp?.output?.mrepo], [undefined, '/node-1', 'local/node-1'], `started: haicc /haicc boot/deploy node-1, executed by the haicc mrepo ${nodeUp?.error ?? ''}`)
    const n1 = join(hc, 'main', 'node-1')
    t.ok((await ask({ repo: n1, op: 'status' }))?.pid, 'the node inside the haicc mrepo (main/node-1), its runtime running')
    t.ok(await hcRepo.read('/xpath/node-1/shortcut.json').then(() => true, () => false), 'its shortcut in the haicc mrepo\'s xpath layer')
    t.is(await repo.read('/xpath/node-1/shortcut.json').catch(() => null), null, 'not in the boot mrepo\'s: each mrepo knows only its own shortcuts')
    const two = await typed(['haicc', '/haicc', 'haicc', '/node-1', 'help/get', '/packages', 'oneliner'])
    t.alike([two?.error, two?.output?.uri, two?.output?.links?.some(l => l.uri.includes('base-package-boot'))], [undefined, '/packages', false], `haicc /haicc haicc /node-1 help/get /packages: chained through two shortcuts, answered by the node ${two?.error ?? ''}`)
    const atRoot = await typed(['haicc', '/haicc', 'haicc', '/', 'help/get', '/packages', 'oneliner'])
    t.ok(!atRoot?.error && atRoot?.output?.links?.some(l => l.uri.includes('base-component-haicc')), `haicc /haicc haicc / help/get: the second haicc at the haicc mrepo's root, executed there ${atRoot?.error ?? ''}`)
    const hcSitu = await typed(['haicc', '/haicc', 'runtime/run', '/packages/haiccing/base-component-haicc/test/validate-in-situ'], 1200)
    t.alike([hcSitu?.error, hcSitu?.output?.ok, hcSitu?.output?.units?.map(u => u.unit)], [undefined, true, ['/test/help-in-situ', '/test/mrepo-in-situ']], `the component validated in situ, in the mrepo it makes ${hcSitu?.error ?? JSON.stringify(hcSitu?.output?.units?.map(u => u.failures) ?? '')}`)
    t.alike((await typed(['haicc', '/haicc', 'boot/teardown', 'node-1']))?.output, { tornDown: '/node-1' }, 'haicc /haicc boot/teardown node-1')
    t.alike((await typed(['haicc', '/', 'boot/teardown', 'haicc']))?.output, { tornDown: '/haicc' }, 'haicc / boot/teardown haicc: a command at the root about the shortcut as an item')
    t.absent(existsSync(hc), 'removed')
    const refused = await sent({ protocol: 'runtime', action: 'run', uri: '/packages/haiccing/base-package-runtime/run' })
    t.ok(/not run here/.test(refused?.error ?? ''), 'a package\'s program: not run in the runtime')

    for (const r of [viewOf(work, 'boot'), host]) t.ok((await ask({ repo: r, op: 'stop' }))?.stopping, `stopped: ${r.endsWith('host') ? 'the host' : 'the boot'}`)
    for (let i = 0; i < 100 && (alive(child.pid) || alive(h3.pid)); i++) await wait(100)
    t.absent(alive(child.pid) || alive(h3.pid), 'both processes ended')

    // run again: already built, the packages unchanged; its runtime started again
    const again = boot(work, [`--sources=folder:${SOURCES}`])
    t.is(again.code, 0)
    const o2 = again.lines.find(l => l.value).value.log
    t.ok(o2[0].already, 'already built')
    t.is(o2[1].committed, false, 'the packages unchanged: nothing committed')
    const records = async l => (await repo.select(`/request/${l}/*`)).filter(([p]) => !p.endsWith('layer.json')).length
    let n = 0
    for (let i = 0; i < 100 && (n = await records('done')) < 46; i++) await wait(100)
    const all = []
    for (const [p] of await repo.select('/request/done/*')) if (!p.endsWith('layer.json')) { const v = JSON.parse((await repo.read(p)).toString()).value.value; all.push(`${v.protocol} ${v.action} ${v.uri}`) }
    t.is(n, 46, `its runtime again: the boot's own request done a second time, nothing else repeated: ${all.sort().join(', ')}`)
    t.ok(await ask({ repo: host, op: 'status' }) === null, 'the host not redeployed, nor started (its runtime stopped above)')
    const s2 = await ask({ repo: viewOf(work, 'boot'), op: 'status' })
    t.ok((await ask({ repo: viewOf(work, 'boot'), op: 'stop' }))?.stopping, 'stopped again')
    for (let i = 0; i < 100 && alive(s2.pid); i++) await wait(100)
    t.absent(alive(s2.pid))
  } finally {
    // whatever happened: its runtimes stopped (the host's, the boot's), then its folder removed
    for (const r of [join(viewOf(work, 'boot'), 'main', 'haicc', 'main', 'node-1'), join(viewOf(work, 'boot'), 'main', 'haicc'), join(viewOf(work, 'boot'), 'main', 'host'), viewOf(work, 'boot')]) {
      const s = await ask({ repo: r, op: 'status' }).catch(() => null)
      if (s?.pid) { try { os.kill(s.pid, 'SIGTERM') } catch {} for (let i = 0; i < 50 && alive(s.pid); i++) await wait(100) }
    }
    rmSync(work, { recursive: true, force: true })
  }
})

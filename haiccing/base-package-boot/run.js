// The boot: the boot mrepo, the root, put in place up to its runtime's start.
// Run with Bare from its bundle (haicc boot/deploy: base-linux-haicc's script) or
// from the package's folder. What it needs is there already: Bare (the one
// running this), the sources. The invocation is a request from the start, a
// record (boot deploy /boot, the command as typed, its key a GUID); each
// step's outcome logged in it:
//   1. the boot mrepo built from its structure into <work>/mrepos/boot/ the
//      first time (mrepo/: from the package's folder, or read out of the
//      bundle this runs from);
//   2. its packages put in place (its packages layer's list): the store
//      <work>/packages/, hard linked individually into its packages/, the
//      list, hashes, sources and store committed;
//   3. the request, completed, into its request/execute: its runtime moves
//      it to request/done first, when it starts;
//   4. its runtime started, from its own packages/, by its directory, on the
//      Bare running this (<bare> <work>/mrepos/boot/packages/haiccing/
//      base-package-runtime.bundle <work>/mrepos/boot), as its own process
//      (it outlives the boot); already running: kept. Its status printed
//      after the request; it did not start: exit 1.
// Nothing is deployed by it: the boot mrepo then takes commands (haicc /
// boot/deploy host <package>).
//   run.js [--work=<folder>] [--sources=folder:<path>|github:<org>]...
//     --work      the work folder: the current one by default
//     --sources   where packages come from, in order (github:haiccing when
//                 none is given)
//     --level     its log's threshold: error, warn, info (default), debug
//     --follow    the records followed after the runtime starts (the default
//                 on a terminal; --no-follow: not), until Ctrl-C
//     --until-done[=<seconds>]  followed until every request is done, then
//                 exit 0 (not in time: exit 4; 60 s by default)
// Our modules from the package's own modules/ (no node_modules above them here).
import process from './modules/node_modules/bare-process/index.js'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from './modules/node_modules/bare-fs/index.js'
import { tmpdir } from './modules/node_modules/bare-os/index.js'
import { join, dirname, resolve, basename } from './modules/node_modules/bare-path/index.js'
import { fileURLToPath } from './modules/node_modules/bare-url/index.js'
import { gitdirOf, open, viewOf, start } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { build, parseSource, place, storeOf } from './modules/pear-full-square/mrepo-base-boot/index.js'
import { record, wrap, guid, complete, logger, follow, EXECUTE } from './modules/pear-full-square/mrepo-base-request/index.js'
import { executed } from './modules/pear-full-square/mrepo-base-execute/index.js'
import { writer, openRepo } from './modules/pear-full-square/mycelium-git/index.js'
import Bundle from './modules/node_modules/bare-bundle/index.js'

// The boot mrepo's structure, mrepo/: beside this file, from the package's
// folder; run from its bundle (bare <bundle>), read out of that bundle, as
// deploy reads any package's.
const bundled = /\.bundle$/.test(process.argv[1] ?? '') ? process.argv[1] : null
const here = bundled ? null : dirname(fileURLToPath(import.meta.url))
const NAME = 'boot'
// Every build of the same structure the same commits (2026-11-10T00:00:00Z).
const BUILT = 1762732800

// The arguments: after the script (bare run.js ..., bare <bundle> /run ...).
const script = /\.(js|bundle)$/.test(process.argv[1] ?? '')
const args = process.argv.slice(script ? 2 : 1).filter(a => a !== '/run')
// The Bare running this: the boot mrepo's runtime is started on it.
const BARE = process.execPath
const value = flag => args.filter(a => a.startsWith(`--${flag}=`)).map(a => a.slice(flag.length + 3))
const work = resolve(value('work')[0] ?? '.')
const sources = (value('sources').length ? value('sources') : ['github:haiccing']).map(parseSource)
// The request: the invocation, as typed (the entry's name, its arguments).
const entry = basename(script ? process.argv[1] : process.argv[0])
const core = record(null, { protocol: 'boot', action: 'deploy', uri: `/${NAME}`, command: [entry, ...args].join(' ') }, guid())
// Its log: each step's outcome, an entry in the request's own record, at or
// above the threshold (--level=<error|warn|info|debug>, info by default).
const { log, entries } = logger(value('level')[0] ?? 'info')
const done = result => complete(core, result, entries)

mkdirSync(work, { recursive: true })
try {
  // 1. Built, the first time.
  if (!existsSync(gitdirOf(work, NAME))) {
    let from = here && join(here, 'mrepo')
    let tmp = null
    if (bundled) {
      tmp = from = mkdtempSync(join(tmpdir(), 'boot-mrepo-'))
      const b = Bundle.from(readFileSync(bundled))
      for (const key of Object.keys(b.files)) {
        // its structure, not its documentation (a README is the help layer's)
        if (!key.startsWith('/mrepo/') || key.endsWith('README.md')) continue
        const p = join(tmp, key.slice('/mrepo/'.length))
        mkdirSync(dirname(p), { recursive: true })
        writeFileSync(p, b.read(key))
      }
    }
    try {
      const { layers } = await build({ from, work, name: NAME, time: BUILT })
      log('info', 'built', { mrepo: viewOf(work, NAME), layers: Object.keys(layers) })
    } finally { if (tmp) rmSync(tmp, { recursive: true, force: true }) }
  } else log('info', 'built', { mrepo: viewOf(work, NAME), already: true })

  // 2. Its packages put in place: the list its packages layer holds.
  const repo = await open(work)
  let list
  try { list = JSON.parse((await openRepo(repo.backend).read('/packages/layer.json')).toString()).packages } finally { await repo.close() }
  const placed = await place({ dir: viewOf(work, NAME), store: storeOf(work), sources, list })
  log('info', 'packages', placed)
} catch (err) {
  // The mrepo there or not: the request printed, the error said.
  console.log(JSON.stringify(done({ ok: false, error: err.message })))
  process.exit(1)
}

// 3. The request completed, into the boot mrepo's request/execute.
const runtime = join(viewOf(work, NAME), 'packages', 'haiccing', 'base-package-runtime.bundle')
const completed = done({ ok: true, value: { runtime: `${BARE} ${runtime} ${viewOf(work, NAME)}` } })
const repo = await open(work)
try { await executed({ backend: repo.backend, writer: writer(repo.backend) }, core.key, wrap(`/${EXECUTE}`, completed)) } finally { await repo.close() }
console.log(JSON.stringify(completed))

// 4. Its runtime started: it takes its request in, then commands.
const status = await start({ repo: viewOf(work, NAME), bundle: runtime, bare: BARE })
console.log(JSON.stringify({ runtime: status ? { pid: status.pid, repository: status.repository.name, started: status.started } : null }))
if (!status) { console.error(`boot: its runtime did not start: ${runtime}`); process.exit(1) }

// 5. Followed, on a terminal or with --follow (not with --no-follow): every
// record as it moves through the request layers, the boot mrepo's and its
// children's in view, one compact line a record, until Ctrl-C (the runtimes
// keep running).
// With --until-done[=<seconds>] instead: followed until every request is
// done (none pending or executing in the boot mrepo or its children, its
// own done), then exits 0; the time limit (60 s by default) passed first:
// exit 4. The runtimes keep running either way.
const until = args.find(a => a === '--until-done' || a.startsWith('--until-done='))
if (until) {
  const limit = Number(until.split('=')[1] ?? 60) * 1000
  const f = follow({ dir: viewOf(work, NAME), name: NAME })
  const end = Date.now() + limit
  let settled = false
  while (!settled && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, 500))
    await f.pass().catch(() => {})
    settled = await f.settled().catch(() => false)
  }
  f.stop()
  if (!settled) { console.error(`boot: not every request done in ${limit / 1000} s`); process.exit(4) }
} else if (args.includes('--follow') || (process.stdout.isTTY && !args.includes('--no-follow'))) {
  const f = follow({ dir: viewOf(work, NAME), name: NAME })
  await new Promise(resolve => process.once('SIGINT', resolve))
  f.stop()
}
// Done: ended here (nothing left open to keep it alive, a terminal's input included).
process.exit(0)

// The boot: the boot mrepo, the root (docs/design/packages.md, "The boot
// mrepo: the root"), put in place up to its runtime's start. The invocation
// is a request from the start, a record (boot deploy /boot, the command as
// typed, its key a GUID); each step's outcome logged in it:
//   1. the prerequisites (prerequisites.json), before anything is written:
//      the platform, the work folder, the sources, Bare (one installed on
//      the PATH at bare.json's major, the same version or newer; else the
//      pinned one, bare.json, put in place, only with a yes; the one used
//      recorded in <work>/bare.json); a missing one stops it (exit 3),
//      the request printed only (no mrepo to hold it);
//   2. the boot mrepo built from its structure into <work>/mrepos/boot/ the
//      first time (mrepo/: in the release, the module mrepo-files.js);
//   3. its packages put in place (its packages layer's list: the runtime and
//      the boot protocol): the store <work>/packages/, hard linked
//      individually into its packages/, the list, hashes, sources and store
//      committed;
//   4. the request, completed, into its request/execute: its runtime moves
//      it to request/done first, when it starts; then it executes its
//      preloaded request, boot deploy /host (the host deployed inside it,
//      main/host/, its runtime started).
//   5. its runtime started, from its own packages/, by its directory, on the
//      Bare put in place (<work>/bare/bin/bare <work>/mrepos/boot/packages/
//      haiccing/base-package-runtime.bundle <work>/mrepos/boot), as its own
//      process (it outlives the boot); already running: kept. Its status
//      printed after the request; it did not start: exit 1.
//   run.js [--work=<folder>] [--sources=folder:<path>|github:<org>]... [--yes]
//     --work      the work folder: the current one by default
//     --sources   where packages and Bare come from, in order (github:haiccing
//                 when none is given)
//     --yes       a fix allowed without asking (else asked on a terminal,
//                 refused otherwise)
//     --level     its log's threshold: error, warn, info (default), debug
//     --follow    the records followed after the runtime starts (the default
//                 on a terminal; --no-follow: not), until Ctrl-C
// Our modules from the package's own modules/ (no node_modules above them here).
import process from './modules/node_modules/bare-process/index.js'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from './modules/node_modules/bare-fs/index.js'
import { tmpdir } from './modules/node_modules/bare-os/index.js'
import { join, dirname, resolve, basename } from './modules/node_modules/bare-path/index.js'
import { fileURLToPath } from './modules/node_modules/bare-url/index.js'
import { gitdirOf, open, viewOf, start } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { build, check, parseSource, place, bareOf, storeOf } from './modules/pear-full-square/mrepo-base-boot/index.js'
import { record, wrap, guid, complete, logger, follow, EXECUTE } from './modules/pear-full-square/mrepo-base-request/index.js'
import { executed } from './modules/pear-full-square/mrepo-base-execute/index.js'
import { writer, openRepo } from './modules/pear-full-square/mycelium-git/index.js'
import prerequisites from './prerequisites.json' with { type: 'json' }
import bare from './bare.json' with { type: 'json' }

// The boot mrepo's structure: in the release, a module (no files beside
// the code inside an executable); from the package's folder, mrepo/.
let embedded = null
embedded = (await import('./mrepo-files.js')).default
const here = embedded ? null : dirname(fileURLToPath(import.meta.url))
const NAME = 'boot'
// Every build of the same structure the same commits (2026-11-10T00:00:00Z).
const BUILT = 1762732800

// The arguments: after the script (bare run.js ..., bare <bundle> ...), or
// straight after the executable (the standalone release: no script).
const script = /\.(js|bundle)$/.test(process.argv[1] ?? '')
const args = process.argv.slice(script ? 2 : 1)
const value = flag => args.filter(a => a.startsWith(`--${flag}=`)).map(a => a.slice(flag.length + 3))
const work = resolve(value('work')[0] ?? '.')
const sources = (value('sources').length ? value('sources') : ['github:haiccing']).map(parseSource)
// A question on a terminal (on stderr: stdout is the record), answered y or n;
// none without a terminal.
const ask = process.stdin.isTTY
  ? q => new Promise(resolve => { process.stderr.write(`${q} [y/N] `); process.stdin.once('data', d => { process.stdin.pause(); process.stdin.destroy(); resolve(/^y/i.test(d.toString().trim())) }) })
  : null

// The request: the invocation, as typed (the entry's name, its arguments).
const entry = basename(script ? process.argv[1] : process.argv[0])
const core = record(null, { api: NAME, protocol: 'boot', action: 'deploy', uri: `/${NAME}`, command: [entry, ...args].join(' ') }, guid())
// Its log: each step's outcome, an entry in the request's own record, at or
// above the threshold (--level=<error|warn|info|debug>, info by default).
const { log, entries } = logger(value('level')[0] ?? 'info')
const done = result => complete(core, result, entries)

const pre = await check(prerequisites.prerequisites, { work, name: NAME, sources, bare, path: process.env.PATH, yes: args.includes('--yes'), ask })
log(pre.ok ? 'info' : 'error', 'prerequisites', { results: pre.results })
if (!pre.ok) {
  // No mrepo to hold it: printed only.
  const last = pre.results.at(-1)
  console.log(JSON.stringify(done({ ok: false, error: `missing: ${last.missing}` })))
  process.exit(3)
}
mkdirSync(work, { recursive: true })
try {
  // 2. Built, the first time.
  if (!existsSync(gitdirOf(work, NAME))) {
    let from = here && join(here, 'mrepo')
    let tmp = null
    if (embedded) {
      tmp = from = mkdtempSync(join(tmpdir(), 'boot-mrepo-'))
      for (const [p, b64] of Object.entries(embedded)) { mkdirSync(dirname(join(tmp, p)), { recursive: true }); writeFileSync(join(tmp, p), Buffer.from(b64, 'base64')) }
    }
    try {
      const { layers } = await build({ from, work, name: NAME, time: BUILT })
      log('info', 'built', { mrepo: viewOf(work, NAME), layers: Object.keys(layers) })
    } finally { if (tmp) rmSync(tmp, { recursive: true, force: true }) }
  } else log('info', 'built', { mrepo: viewOf(work, NAME), already: true })

  // 3. Its packages put in place: the list its packages layer holds.
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

// 4. The request completed, into the boot mrepo's request/execute.
const runtime = join(viewOf(work, NAME), 'packages', 'haiccing', 'base-package-runtime.bundle')
const completed = done({ ok: true, value: { runtime: `${bareOf(work)} ${runtime} ${viewOf(work, NAME)}` } })
const repo = await open(work)
try { await executed({ backend: repo.backend, writer: writer(repo.backend) }, core.key, wrap(`/${EXECUTE}`, completed)) } finally { await repo.close() }
console.log(JSON.stringify(completed))

// 5. Its runtime started: it takes its request in, then its preloaded ones.
const status = await start({ repo: viewOf(work, NAME), bundle: runtime, bare: bareOf(work) })
console.log(JSON.stringify({ runtime: status ? { pid: status.pid, repository: status.repository.name, started: status.started } : null }))
if (!status) { console.error(`boot: its runtime did not start: ${runtime}`); process.exit(1) }

// 6. Followed, on a terminal or with --follow (not with --no-follow): every
// record as it moves through the request layers, the boot mrepo's and its
// children's in view, one compact line a record, until Ctrl-C (the runtimes
// keep running).
if (args.includes('--follow') || (process.stdout.isTTY && !args.includes('--no-follow'))) {
  const f = follow({ dir: viewOf(work, NAME), name: NAME })
  await new Promise(resolve => process.once('SIGINT', resolve))
  f.stop()
}
// Done: ended here (nothing left open to keep it alive, a terminal's input included).
process.exit(0)

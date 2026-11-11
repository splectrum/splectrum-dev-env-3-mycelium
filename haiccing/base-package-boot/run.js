// The boot: the boot mrepo, the root (docs/design/packages.md, "The boot
// mrepo: the root"). The invocation is a request from the start, a record
// (boot deploy /boot, the command as typed, its key a GUID); each step's
// outcome logged in it; completed, it is put into the boot mrepo's
// request/execute once the mrepo is there, before its runtime starts, so the
// runtime moves it to request/done first; without an mrepo (a prerequisite
// missing) it is printed only. First its prerequisites (prerequisites.json), checked
// before anything is written: the platform, the work folder, the sources,
// Bare (bare.json: put in place if missing, only with a yes); a missing one
// stops it (exit 3). Then the boot mrepo built from its structure (mrepo/)
// into <work>/mrepos/boot/ the first time, and run: the runtime, in this
// process, on the filesystem storage. Its preloaded request starts it.
//   bare run.js [--work=<folder>] [--sources=folder:<path>|github:<org>]... [--yes]
//     --work      the work folder: the current one by default
//     --sources   where packages and Bare come from, in order (github:haiccing
//                 when none is given)
//     --yes       a fix allowed without asking (else asked on a terminal,
//                 refused otherwise)
// Our modules from the package's own modules/ (no node_modules above them here).
import process from './modules/node_modules/bare-process/index.js'
import { existsSync, mkdirSync } from './modules/node_modules/bare-fs/index.js'
import { join, dirname, resolve, basename } from './modules/node_modules/bare-path/index.js'
import { fileURLToPath } from './modules/node_modules/bare-url/index.js'
import { run, gitdirOf, open } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { build } from './modules/pear-full-square/mrepo-base-runtime/lib/build.js'
import { check, parseSource } from './modules/pear-full-square/mrepo-base-runtime/lib/prerequisites.js'
import { record, wrap, guid, complete, EXECUTE } from './modules/pear-full-square/mrepo-base-request/index.js'
import { executed } from './modules/pear-full-square/mrepo-base-execute/index.js'
import { writer } from './modules/pear-full-square/mycelium-git/index.js'
import prerequisites from './prerequisites.json' with { type: 'json' }
import bare from './bare.json' with { type: 'json' }

const here = dirname(fileURLToPath(import.meta.url))
const NAME = 'boot'
// Every build of the same structure the same commits (2026-11-10T00:00:00Z).
const BUILT = 1762732800

const args = process.argv.slice(2)
const value = flag => args.filter(a => a.startsWith(`--${flag}=`)).map(a => a.slice(flag.length + 3))
const work = resolve(value('work')[0] ?? '.')
const sources = (value('sources').length ? value('sources') : ['github:haiccing']).map(parseSource)
// A question on a terminal, answered y or n; none without a terminal.
const ask = process.stdin.isTTY
  ? q => new Promise(resolve => { process.stdout.write(`${q} [y/N] `); process.stdin.once('data', d => { process.stdin.pause(); resolve(/^y/i.test(d.toString().trim())) }) })
  : null

// The request: the invocation, as typed (the entry's name, its arguments).
const entry = basename(process.argv[1]?.endsWith('.js') ? process.argv[1] : process.argv[0])
const core = record(null, { api: NAME, protocol: 'boot', action: 'deploy', uri: `/${NAME}`, command: [entry, ...args].join(' ') }, guid())
// The outcomes, logged as it goes: the request's output.
const outcomes = []
const done = result => complete(core, result)

const pre = await check(prerequisites.prerequisites, { work, name: NAME, sources, bare, yes: args.includes('--yes'), ask })
outcomes.push({ step: 'prerequisites', ok: pre.ok, results: pre.results })
if (!pre.ok) {
  // No mrepo to hold it: printed only.
  const last = pre.results.at(-1)
  console.log(JSON.stringify(done({ ok: false, error: `missing: ${last.missing}` })))
  process.exit(3)
}
mkdirSync(work, { recursive: true })
if (!existsSync(gitdirOf(work, NAME))) {
  const { layers } = await build({ from: join(here, 'mrepo'), work, name: NAME, time: BUILT })
  outcomes.push({ step: 'built', ok: true, mrepo: join(work, 'mrepos', NAME), layers: Object.keys(layers) })
} else outcomes.push({ step: 'built', ok: true, mrepo: join(work, 'mrepos', NAME), already: true })

// The request completed, into the boot mrepo's request/execute, before its
// runtime starts.
const completed = done({ ok: true, value: { outcomes } })
const repo = await open(work)
try { await executed({ backend: repo.backend, writer: writer(repo.backend) }, core.key, wrap(`/${EXECUTE}`, completed)) } finally { await repo.close() }
console.log(JSON.stringify(completed))
await run({ work })

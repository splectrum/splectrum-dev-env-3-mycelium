// The boot: the boot mrepo, the root (docs/design/packages.md, "The boot
// mrepo: the root"). First its prerequisites (prerequisites.json), checked
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
import { join, dirname, resolve } from './modules/node_modules/bare-path/index.js'
import { fileURLToPath } from './modules/node_modules/bare-url/index.js'
import { run, gitdirOf } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { build } from './modules/pear-full-square/mrepo-base-runtime/lib/build.js'
import { check, parseSource } from './modules/pear-full-square/mrepo-base-runtime/lib/prerequisites.js'
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
const pre = await check(prerequisites.prerequisites, { work, name: NAME, sources, bare, yes: args.includes('--yes'), ask })
console.log(JSON.stringify({ prerequisites: pre.results }))
if (!pre.ok) {
  const last = pre.results.at(-1)
  console.error(`boot: missing: ${last.missing}`)
  process.exit(3)
}
mkdirSync(work, { recursive: true })
if (!existsSync(gitdirOf(work, NAME))) {
  const { layers } = await build({ from: join(here, 'mrepo'), work, name: NAME, time: BUILT })
  console.log(JSON.stringify({ built: join(work, 'mrepos', NAME), layers: Object.keys(layers) }))
}
console.log(JSON.stringify({ running: NAME, work, pid: process.pid }))
await run({ work })

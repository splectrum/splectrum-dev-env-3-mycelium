// The boot: the boot mrepo, the root (docs/design/packages.md, "The boot
// mrepo: the root"), built from its structure (mrepo/) into
// <work>/mrepos/boot/ the first time, then run: the runtime, in this
// process, on the filesystem storage (p2p-git, every layer on the
// filesystem, no Corestore). Its preloaded request starts it.
//   bare boot.js [--work=<folder>]     the work folder: the current one by default
// Our modules from the package's own modules/ (no node_modules above them here).
import process from './modules/node_modules/bare-process/index.js'
import { existsSync, mkdirSync } from './modules/node_modules/bare-fs/index.js'
import { join, dirname, resolve } from './modules/node_modules/bare-path/index.js'
import { fileURLToPath } from './modules/node_modules/bare-url/index.js'
import { run, gitdirOf } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { build } from './modules/pear-full-square/mrepo-base-runtime/lib/build.js'

const here = dirname(fileURLToPath(import.meta.url))
const NAME = 'boot'
// Every build of the same structure the same commits (2026-11-10T00:00:00Z).
const BUILT = 1762732800

const arg = process.argv.slice(2).find(a => a.startsWith('--work='))
const work = resolve(arg ? arg.slice('--work='.length) : '.')
mkdirSync(work, { recursive: true })
if (!existsSync(gitdirOf(work, NAME))) {
  const { layers } = await build({ from: join(here, 'mrepo'), work, name: NAME, time: BUILT })
  console.log(JSON.stringify({ built: join(work, 'mrepos', NAME), layers: Object.keys(layers) }))
}
console.log(JSON.stringify({ running: NAME, work, pid: process.pid }))
await run({ work })

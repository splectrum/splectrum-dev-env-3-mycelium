// The mrepo runtime: the engine every mrepo runs on (docs/design/packages.md,
// "The packages of an mrepo"), this process. Its repository opened by the
// setting in the work folder (<work>/mrepo.json); the protocols run until it
// is stopped (its local connection, <work>/runtime.sock; SIGTERM, SIGINT) or
// shut down.
//   bare base-package-runtime.bundle --work=<folder>     (the current one by default)
// Started from an mrepo's own packages/ (the boot's release; a parent's deploy).
import process from './modules/node_modules/bare-process/index.js'
import { resolve } from './modules/node_modules/bare-path/index.js'
import { run } from './modules/pear-full-square/mrepo-base-runtime/index.js'

const arg = process.argv.slice(2).find(a => a.startsWith('--work='))
await run({ work: resolve(arg ? arg.slice('--work='.length) : '.') })

// The mrepo runtime: the engine every mrepo runs on, this process, for one mrepo: the protocols run
// until it is stopped (its local connection; SIGTERM, SIGINT) or shut down.
//   bare <repo dir>/packages/haiccing/base-package-runtime.bundle <repo dir>
//       the mrepo at <repo dir> (<work>/mrepos/<name>: the filesystem storage,
//       its socket <repo dir>/runtime.sock), started from its own packages/
//       (its pinned runtime) by its deploy
//   bare base-package-runtime.bundle --work=<folder>
//       the mrepo the work folder's setting names (<work>/mrepo.json)
import process from './modules/node_modules/bare-process/index.js'
import { resolve } from './modules/node_modules/bare-path/index.js'
import { run } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { actions, protocols } from './protocol.js'

const args = process.argv.slice(2)
const repo = args.find(a => !a.startsWith('--'))
const work = args.find(a => a.startsWith('--work='))
// its own protocols, from its protocol.js
const own = { pkg: 'haiccing/base-package-runtime', actions, protocols }
await run(repo ? { repo: resolve(repo), own } : { work: resolve(work ? work.slice('--work='.length) : '.'), own })
process.exit(0) // stopped: ended here (its signal handlers would hold the process open)

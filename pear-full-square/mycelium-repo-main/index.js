// mycelium-repo-main: a running mycelium repository's main thread, as a
// library (main.js is its command line, base-package-mycelium's entry).
// Built step by step (phase 3, step 2; docs/design/repositories.md, "A
// running repository"): for now its identity; next, started by the boot as
// the level's main thread (the store held as its single writer).
//   import { version } from 'mycelium-repo-main'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }

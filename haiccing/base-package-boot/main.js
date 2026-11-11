// The package's dispatcher, its bundle's main (written by tools/package-bundle.js).
// Started as the program (bare <package>.bundle ...): run.js runs. Imported
// (a runtime loading a protocol, a deploy reading structure): nothing runs;
// the entry points offered.
import os from './modules/node_modules/bare-os/index.js'
import { URL } from './modules/node_modules/bare-url/index.js'
export const run = () => import('./run.js')
export const protocol = () => import('./protocol.js')
// This bundle the program: the file Bare was started with, resolved, is it.
const self = new URL('.', import.meta.url).href.replace(/\/$/, '')
const started = Bare.argv[1] ? new URL(Bare.argv[1], `file://${os.cwd()}/`).href : null
if (started === self) await run()

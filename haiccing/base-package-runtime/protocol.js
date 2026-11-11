// base-package-runtime's protocols, offered in every mrepo (the runtime
// passes them to itself from its run.js; other runtimes skip its bundle).
//   runtime   run: a linked package's entry by path, its tests above all
//   help      get: the mrepo's help layer, read by URI
// The work is the modules': mrepo-base-runtime's run, mrepo-base-help's get.
import { runtimeRun } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { get } from './modules/pear-full-square/mrepo-base-help/index.js'

const ANY = { uris: ['/**'] }

export const protocols = {
  runtime: {
    package: 'haiccing/base-package-runtime',
    description: 'Runs a linked package\'s entry by path, its tests above all.',
    actions: { run: { uris: ['/packages/**'], description: 'A linked package\'s target, through its dispatcher; body { dryRun }.' } }
  },
  help: {
    package: 'haiccing/base-package-runtime',
    description: 'The mrepo\'s help, read by URI.',
    actions: { get: { ...ANY, description: 'The README documenting a URI, at a level; body { level, section }.' } }
  }
}

export const actions = {
  runtime: { run: runtimeRun },
  help: { get }
}

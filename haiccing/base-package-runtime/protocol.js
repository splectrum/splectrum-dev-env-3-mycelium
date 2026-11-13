// base-package-runtime's protocols, offered in every mrepo (the runtime
// passes them to itself from its run.js; other runtimes skip its bundle).
//   runtime   run: a linked package's entry by path, its tests above all;
//             register: the protocols loaded, recorded in the protocols layer
//   help      get: the mrepo's help layer, read by URI; extract: the layer
//             written, an internal request the runtime places as it starts
// The work is the modules': mrepo-base-runtime's run, mrepo-base-help's get.
import { runtimeRun, runtimeRegister } from './modules/pear-full-square/mrepo-base-runtime/index.js'
import { get, extractAction } from './modules/pear-full-square/mrepo-base-help/index.js'

const ANY = { uris: ['/**'] }

export const protocols = {
  runtime: {
    package: 'haiccing/base-package-runtime',
    description: 'Runs a linked package\'s entry by path, its tests above all.',
    actions: {
      run: { uris: ['/packages/**'], description: 'A linked package\'s target, through its dispatcher; with dry-run, what it would run.' },
      register: { uris: ['/'], description: 'The protocols the runtime loaded, recorded in the protocols layer; placed by the runtime as it starts.' }
    }
  },
  help: {
    package: 'haiccing/base-package-runtime',
    description: 'The mrepo\'s help, read by URI.',
    actions: {
      get: { ...ANY, description: 'The README documenting a URI, at a level (oneliner, summary, detail) or one section, by its title.' },
      extract: { uris: ['/'], description: 'The help layer extracted from the linked packages\' READMEs; placed by the runtime as it starts.' }
    }
  }
}

export const actions = {
  runtime: { run: runtimeRun, register: runtimeRegister },
  help: { get, extract: extractAction }
}

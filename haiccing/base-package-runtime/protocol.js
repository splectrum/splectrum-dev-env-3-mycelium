// base-package-runtime's protocol, offered in every mrepo (the runtime
// passes it to itself from its run.js; other runtimes skip its bundle).
//   runtime   run: a linked package's entry by path, its tests above all;
//             register: the protocols loaded, recorded in the protocols layer
// The work is the module's: mrepo-base-runtime's.
import { runtimeRun, runtimeRegister } from './modules/pear-full-square/mrepo-base-runtime/index.js'

export const protocols = {
  runtime: {
    package: 'haiccing/base-package-runtime',
    description: 'Runs a linked package\'s entry by path, its tests above all.',
    actions: {
      run: { uris: ['/packages/**'], target: true, description: 'A linked package\'s target, through its dispatcher; with dry-run, what it would run.' },
      register: { uris: ['/'], description: 'The protocols the runtime loaded, recorded in the protocols layer; placed by the runtime as it starts.' }
    }
  }
}

export const actions = {
  runtime: { run: runtimeRun, register: runtimeRegister }
}

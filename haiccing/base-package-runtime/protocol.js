// base-package-runtime's protocol, offered in every mrepo (the runtime
// passes it to itself from its run.js; other runtimes skip its bundle).
//   runtime   run: a linked package's entry by path, its tests above all
// The work is the module's: mrepo-base-runtime's.
import { runtimeRun } from './modules/pear-full-square/mrepo-base-runtime/index.js'

export const protocols = {
  runtime: {
    package: 'haiccing/base-package-runtime',
    description: 'Runs a linked package\'s entry by path, its tests above all.',
    actions: {
      run: { uris: ['/packages/**'], target: true, description: 'A linked package\'s target, through its dispatcher; with dry-run, what it would run.' }
    }
  }
}

export const actions = {
  runtime: { run: runtimeRun }
}

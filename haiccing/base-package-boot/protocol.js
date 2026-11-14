// base-package-boot's protocols: the boot protocol, mounted by every mrepo that deploys
// others. Linked into an mrepo, its config and its actions are loaded by
// the runtime; a hook activates it for the outside.
//   protocols   the configs: each protocol's actions, the URIs, the service
//               states each is allowed in, the package that implements it
//   actions     the actions, by protocol: (exec, form) -> output, or throws
// The work is mrepo-base-boot's; here only what the package offers.
import { deploy, teardown, redeploy } from './modules/pear-full-square/mrepo-base-boot/index.js'

// A target is needed: / is the mrepo itself, which one cannot deploy or
// tear down.
const CHILD = { uris: ['<name>'], target: true }

export const protocols = {
  boot: {
    package: 'haiccing/base-package-boot',
    description: 'Deploys and tears down child mrepos; executed by the parent.',
    actions: {
      deploy: { ...CHILD, args: ['package'], description: 'A child mrepo built inside this one from a target package, its packages linked, its runtime started; its argument the package.' },
      teardown: { ...CHILD, description: 'The child\'s runtime stopped, the child and its record removed.' },
      redeploy: { ...CHILD, args: ['package?'], description: 'Teardown, then deploy.' }
    }
  }
}

export const actions = {
  boot: { deploy, teardown, redeploy }
}

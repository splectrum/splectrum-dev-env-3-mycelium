// base-package-boot's protocols: the boot protocol, mounted by every mrepo that deploys
// others. Linked into an mrepo, its configs are registered in the
// protocols layer and its actions loaded by the runtime.
//   protocols   the configs: each protocol's actions, the URIs, the service
//               states each is allowed in, the package that implements it
//   actions     the actions, by protocol: (exec, form) -> output, or throws
// The work is mrepo-base-boot's; here only what the package offers.
import { deploy, teardown, redeploy } from './modules/pear-full-square/mrepo-base-boot/index.js'

const CHILD = { uris: ['/<name>'] }

export const protocols = {
  boot: {
    package: 'haiccing/base-package-boot',
    description: 'Deploys and tears down child mrepos; executed by the parent.',
    actions: {
      deploy: { ...CHILD, description: 'A child mrepo built inside this one from a target package, its packages linked, its runtime started; body { package }.' },
      teardown: { ...CHILD, description: 'The child\'s runtime stopped, the child and its record removed.' },
      redeploy: { ...CHILD, description: 'Teardown, then deploy.' }
    }
  }
}

export const actions = {
  boot: { deploy, teardown, redeploy }
}

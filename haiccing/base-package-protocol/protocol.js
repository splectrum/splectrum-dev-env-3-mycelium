// base-package-protocol's protocol: protocol, activating and deactivating
// the protocols an mrepo offers to the outside. Linked into an mrepo, its
// config is loaded by the runtime and its actions run.
// The work and the config are mrepo-base-protocol's; here the mounting.
import { activate, deactivate, CONFIG } from './modules/pear-full-square/mrepo-base-protocol/index.js'

export const protocols = {
  protocol: { package: 'haiccing/base-package-protocol', ...CONFIG }
}

export const actions = {
  protocol: { activate, deactivate }
}

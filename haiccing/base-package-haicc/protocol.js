// base-package-haicc's protocol: haicc, a command executed at a node
// position, or sent on where the node is a shortcut. Linked into an mrepo,
// its config is loaded by the runtime and its action run.
// The work and the config are mrepo-base-haicc's; here the mounting.
import { goto, CONFIG } from './modules/pear-full-square/mrepo-base-haicc/index.js'

export const protocols = {
  haicc: { package: 'haiccing/base-package-haicc', ...CONFIG }
}

export const actions = {
  haicc: { goto }
}

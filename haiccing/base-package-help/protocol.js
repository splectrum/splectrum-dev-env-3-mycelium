// base-package-help's protocol: help, an mrepo's help extracted from its
// packages' READMEs and read by URI. Linked into an mrepo, its config is
// loaded by the runtime and its actions run; its structure part brings the
// help layer.
//   get       the README documenting a URI, at a level or one section
//   extract   the help layer written from the linked packages' READMEs
// The work is mrepo-base-help's; here the mounting.
import { get, extractAction } from './modules/pear-full-square/mrepo-base-help/index.js'

export const protocols = {
  help: {
    package: 'haiccing/base-package-help',
    description: 'The mrepo\'s help, read by URI.',
    actions: {
      get: { uris: ['.'], args: ['subject?'], description: 'The README documenting a subject, a URI from the mrepo\'s root (none: the mrepo itself), at a level (oneliner, summary, detail) or one section, by its title.' },
      extract: { uris: ['.'], description: 'The help layer extracted from the linked packages\' READMEs.' }
    }
  }
}

export const actions = {
  help: { get, extract: extractAction }
}

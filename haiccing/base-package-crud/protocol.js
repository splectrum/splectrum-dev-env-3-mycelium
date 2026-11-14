// base-package-crud's protocol: crud, the generic actions on an mrepo's
// data: its nodes created, read and deleted by URI. Linked into an mrepo,
// its config is loaded by the runtime and its actions run.
// The work and the config are mrepo-base-crud's; here the mounting (its
// delete is the module's remove: delete is a word of the language).
import { create, read, remove, CONFIG } from './modules/pear-full-square/mrepo-base-crud/index.js'

export const protocols = {
  crud: { package: 'haiccing/base-package-crud', ...CONFIG }
}

export const actions = {
  crud: { create, read, delete: remove }
}

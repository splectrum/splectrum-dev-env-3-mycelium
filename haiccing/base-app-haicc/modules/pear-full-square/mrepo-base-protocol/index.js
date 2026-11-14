// mrepo-base-protocol: its documented methods, a directory each (README.md beside each).
//   external/   the protocol protocol's actions: activate, deactivate
//   internal/   config.js: the protocol's config, where the active set is
export { activate } from './external/activate/index.js'
export { deactivate } from './external/deactivate/index.js'
export { CONFIG, activeAt } from './internal/config.js'

// mrepo-base-crud: its documented methods, a directory each (README.md beside each).
//   external/   the crud protocol's actions: create, read, delete
//   internal/   node: a node as it is stored, and the nodes a URI selects;
//               config.js: the protocol's config
export { create } from './external/create/index.js'
export { read } from './external/read/index.js'
export { remove } from './external/delete/index.js'
export { place, nodeAt, select, NODE } from './internal/node/index.js'
export { CONFIG } from './internal/config.js'

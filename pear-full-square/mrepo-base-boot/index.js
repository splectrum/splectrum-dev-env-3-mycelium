// mrepo-base-boot: its documented methods, a directory each (README.md beside each).
//   external/   the boot protocol's actions: deploy, teardown, redeploy
//   internal/   the install routine and what the actions use
export { deploy } from './external/deploy/index.js'
export { teardown } from './external/teardown/index.js'
export { redeploy } from './external/redeploy/index.js'
export { build } from './internal/build/index.js'
export { place, storeOf } from './internal/place/index.js'
export { fetch, structureOf, parseSource } from './internal/fetch/index.js'
export { check, inContainer, acceptable, bareOf, BARE_ORG, TARBALL } from './internal/check/index.js'

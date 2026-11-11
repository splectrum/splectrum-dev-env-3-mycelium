// mrepo-base-boot: its methods, a directory each (README.md beside each).
//   external/   the boot protocol's actions: deploy, teardown, redeploy
//   internal/   the install routine and what the actions use
export { deploy } from './external/deploy/index.js'
export { teardown } from './external/teardown/index.js'
export { redeploy } from './external/redeploy/index.js'
export { build } from './internal/build/index.js'
export { place } from './internal/place/index.js'
export { fetch } from './internal/fetch/index.js'
export { structureOf } from './internal/structure-of/index.js'
export { storeOf } from './internal/store-of/index.js'
export { check, BARE_ORG, TARBALL } from './internal/check/index.js'
export { parseSource } from './internal/parse-source/index.js'
export { inContainer } from './internal/in-container/index.js'
export { bareOf } from './internal/bare-of/index.js'
export { acceptable } from './internal/acceptable/index.js'

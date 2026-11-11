// mrepo-base-boot: the mrepo boot protocol (docs/design/repositories.md,
// "The external API": deploy, teardown, redeploy, executed by the parent),
// carried by base-package-boot and linked into every mrepo that deploys
// others: its actions, the install routine's first piece, the prerequisite
// checks.
//   build({ from, work, name, time })   an mrepo built from its structure (lib/build.js)
//   check(list, ctx)                    the prerequisites checked, a fix only with a yes (lib/prerequisites.js)
//   deploy, teardown, redeploy          the boot protocol's actions (lib/deploy.js)
//   place({ dir, store, sources, list }) packages put in place: the store, links, the layer (lib/packages.js)
//   fetch, structureOf                  a package into the store; its mrepo/ part, from its bundle
export { build } from './lib/build.js'
export { deploy, teardown, redeploy } from './lib/deploy.js'
export { place, fetch, structureOf, storeOf } from './lib/packages.js'
export { check, parseSource, inContainer, bareOf, acceptable, BARE_ORG, TARBALL } from './lib/prerequisites.js'

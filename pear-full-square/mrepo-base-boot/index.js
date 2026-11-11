// mrepo-base-boot: the mrepo boot protocol (docs/design/repositories.md,
// "The external API": deploy, teardown, redeploy, executed by the parent),
// carried by base-package-boot and linked into every mrepo that deploys
// others. So far its install routine's first piece and the prerequisite
// checks; the actions to come.
//   build({ from, work, name, time })   an mrepo built from its structure (lib/build.js)
//   check(list, ctx)                    the prerequisites checked, a fix only with a yes (lib/prerequisites.js)
export { build } from './lib/build.js'
export { check, parseSource, inContainer, bareOf, BARE_ORG, TARBALL } from './lib/prerequisites.js'

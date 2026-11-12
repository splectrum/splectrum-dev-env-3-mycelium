// pkgm-base-check: the code rules, and the test every package carrying it
// runs on itself (README.md beside each).
//   internal/   the rules
//   validate/   code.test.js: a package's code (/test/code); mrepo.test.js,
//               mrepo-in-situ.test.js: its mrepo side (/test/mrepo, /test/mrepo-in-situ)
export { checkModule, checkPackage, jsFiles } from './internal/rules/index.js'
export { checkStructure, checkProtocol, checkCarried, leaves, contributions } from './internal/mrepo/index.js'

// pkgm-base-check: the code rules, and the test every package carrying it
// runs on itself (README.md beside each).
//   internal/   the rules
//   validate/   code.test.js: a package's code checked (/test/code)
export { checkModule, checkPackage, jsFiles } from './internal/rules/index.js'

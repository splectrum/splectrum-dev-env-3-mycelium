// mrepo-base-help: its documented methods, a directory each (README.md beside each).
//   external/   the help protocol's actions: get, extract
//   internal/   the extraction and the README rules
//   validate/   the tests every package carrying it runs on itself
export { get } from './external/get/index.js'
export { extractAction } from './external/extract/index.js'
export { extract, parse, check } from './internal/extract/index.js'

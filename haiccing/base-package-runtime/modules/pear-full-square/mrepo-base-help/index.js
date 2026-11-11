// mrepo-base-help: its documented methods, a directory each (README.md beside each).
//   external/   the help protocol's actions: get
//   internal/   the extraction, run by the runtime before the mrepo is operational
//   validate/   the tests every package carrying it runs on itself
export { get } from './external/get/index.js'
export { extract, extractInto, parse, check } from './internal/extract/index.js'

// mycelium-uri — our URIs and names: validate, parse, split at known
// prefixes; names and data names (rules.md). The one validator for both.
// Plain, pure functions: a run reproduces them from their arguments.

export { isSegment, validate, sameName, isUri, parse, format, join, parent, split } from './lib/uri.js'
export { isName, validateName, isDataName, validateDataName, uriFormOf, dataNameOf } from './lib/names.js'

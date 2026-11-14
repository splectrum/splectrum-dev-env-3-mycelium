// Names, by the rules (rules.md: URIs, Data names). The one validator for
// names: used where input enters (network handlers, command-line
// arguments, external files); inside, names are valid.
//
// A name is a URI segment without extensions: lowercase a-z, 0-9, words
// joined by single '-' (`node-1`, `hosts`). Names of swarms, nodes,
// resources, repositories and requests are names.
//
// A data name is the name of a property in a record, a value or a header:
// lowerCamelCase, letters and digits, starting with a lowercase letter, no
// two capitals in a row (`publicKey`, `dhtUrl`). The same in JSON, in
// memory and in AVRO. In a URI it takes its URI form, each capital as '-'
// and the letter in lowercase (`public-key`); exact both ways. '_' is
// reserved: in neither.

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DATA_NAME = /^[a-z][a-zA-Z0-9]*$/
const URI_FORM = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/

export function isName (s) {
  return typeof s === 'string' && NAME.test(s)
}

// The boundary: the name, or throws. `what` names it in the error.
export function validateName (s, what = 'name') {
  if (!isName(s)) throw new Error(`not a ${what}: ${s}`)
  return s
}

export function isDataName (s) {
  return typeof s === 'string' && DATA_NAME.test(s) && !/[A-Z]{2}/.test(s)
}

export function validateDataName (s) {
  if (!isDataName(s)) throw new Error(`not a data name: ${s}`)
  return s
}

// publicKey → public-key
export function uriFormOf (dataName) {
  return dataName.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
}

// public-key → publicKey; throws when the segment is not a data name's URI form.
export function dataNameOf (segment) {
  if (typeof segment !== 'string' || !URI_FORM.test(segment)) throw new Error(`not a data name's URI form: ${segment}`)
  return segment.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

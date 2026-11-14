// A command: a request as it is typed, its parts in order,
//   <protocol>/<action> <URI> <argument>...
// given as an array of parts or as a string (split at its spaces).
//
// A URI in a request is relative: no leading slash, relative to where its
// writer stands. `.` is the position itself; none given means `.`; `./x`
// is `x`. Outside it is one segment, as it is written.
// Inside, in the form the mrepo works with, a URI is an array of segments
// (mycelium-uri): the prefix where its writer stands, then the URI as it
// was written:
//   OUTSIDE   a request from outside stands at the mrepo's main: the prefix
//             main, two segments: ['main', 'host'], ['main', '.']; the
//             outside is restricted to main
//   OWN       the mrepo itself (a hook, a request of its own) stands at its
//             root, the folder above the layers: no prefix, one segment,
//             the layer first in it: ['runtime/hooks'], ['.']
import { relative, ROOT } from 'mycelium-uri'

export { ROOT }
export const MAIN = 'main'
export const OUTSIDE = [MAIN]
export const OWN = []

//   interpret(command, protocols, at) -> { protocol, action, uri, args }
//     the first part    <protocol>/<action>; the protocol alone: its default
//                       action (its config's `default`, in protocols)
//     the second        the URI, as written where the writer stands (at,
//                       a prefix: OWN by default); none: `.`; in the form
//                       the prefix's segments, then it
//     the rest          the arguments, a list, unnamed
// Throws when it is no command, or the action cannot be told.
export function interpret (command, protocols = {}, at = OWN) {
  const parts = typeof command === 'string' ? command.trim().split(/\s+/).filter(Boolean) : command
  if (!Array.isArray(parts) || !parts.length || parts.some(p => typeof p !== 'string' || !p)) throw new Error('not a command: its parts, <protocol>/<action> <URI> <arguments>')
  const [first, second, ...args] = parts
  const names = first.split('/')
  if (names.length > 2 || names.some(n => !n)) throw new Error(`not a command: ${first} (<protocol>/<action>)`)
  const [protocol, action = protocols?.[protocol]?.default] = names
  if (!action) throw new Error(`no action: ${first} (${protocol} has no default action)`)
  return { protocol, action, uri: [...at, relative(second)], args }
}

// A request's value, as it is given, made the form the mrepo works with:
// a command (a string, an array of parts, or { command }) interpreted, its
// protocol, action, URI and arguments beside it; a form given filled in
// ({ protocol, action, uri, args }): its URI, one segment as written, taken
// where the writer stands, the same. Once: a form is made where a request
// comes in.
export function formOf (value, protocols = {}, at = OWN) {
  if (typeof value === 'string' || Array.isArray(value)) value = { command: value }
  if (!value || typeof value !== 'object') return value
  if (value.command !== undefined && value.protocol === undefined) return { ...value, ...interpret(value.command, protocols, at) }
  if (value.protocol === undefined) return value
  if (Array.isArray(value.uri)) throw new Error('not a URI: one segment, as it is written')
  return { ...value, uri: [...at, relative(value.uri)] }
}

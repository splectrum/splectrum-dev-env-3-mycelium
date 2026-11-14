// A command: a request as it is typed, its parts in order,
//   <protocol>/<action> <URI> <argument>...
// given as an array of parts or as a string (split at its spaces).
//
// A URI in a request is relative: no leading slash, relative to where its
// writer stands. `.` is the position itself; none given means `.`; `./x`
// is `x`. Where the writer stands:
//   MAIN   a request from outside: the mrepo's main (`.` is main, `host`
//          is main/host): the outside is restricted to main
//   ROOT   the mrepo itself (a hook, a request of its own): its root, the
//          folder above the layers; its commands name the layer first
// The form the mrepo works with holds the URI from its root: main,
// main/host, runtime/hooks, `.` the root itself. The URI functions are
// mycelium-uri's (relative, from, within, slashed).
import { relative, from, ROOT } from 'mycelium-uri'

export { ROOT }
export const MAIN = 'main'

//   interpret(command, protocols, at) -> { protocol, action, uri, args }
//     the first part    <protocol>/<action>; the protocol alone: its default
//                       action (its config's `default`, in protocols)
//     the second        the URI, as written where the writer stands (at:
//                       ROOT by default); none: `.`; in the form from the root
//     the rest          the arguments, a list, unnamed
// Throws when it is no command, or the action cannot be told.
export function interpret (command, protocols = {}, at = ROOT) {
  const parts = typeof command === 'string' ? command.trim().split(/\s+/).filter(Boolean) : command
  if (!Array.isArray(parts) || !parts.length || parts.some(p => typeof p !== 'string' || !p)) throw new Error('not a command: its parts, <protocol>/<action> <URI> <arguments>')
  const [first, second, ...args] = parts
  const names = first.split('/')
  if (names.length > 2 || names.some(n => !n)) throw new Error(`not a command: ${first} (<protocol>/<action>)`)
  const [protocol, action = protocols?.[protocol]?.default] = names
  if (!action) throw new Error(`no action: ${first} (${protocol} has no default action)`)
  return { protocol, action, uri: from(at, relative(second)), args }
}

// A request's value, as it is given, made the form the mrepo works with:
// a command (a string, an array of parts, or { command }) interpreted, its
// protocol, action, URI and arguments beside it; a form given filled in
// ({ protocol, action, uri, args }): its URI taken as written where the
// writer stands, the same. Once: a form is made where a request comes in.
export function formOf (value, protocols = {}, at = ROOT) {
  if (typeof value === 'string' || Array.isArray(value)) value = { command: value }
  if (!value || typeof value !== 'object') return value
  if (value.command !== undefined && value.protocol === undefined) return { ...value, ...interpret(value.command, protocols, at) }
  if (value.protocol === undefined) return value
  return { ...value, uri: from(at, relative(value.uri)) }
}

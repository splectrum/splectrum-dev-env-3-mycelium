// A command: a request as it is typed, its parts in order,
//   <protocol>/<action> <URI> <argument>...
// given as an array of parts or as a string (split at its spaces).
//   interpret(command, protocols) -> { protocol, action, uri, args }
//     the first part    <protocol>/<action>; the protocol alone: its default
//                       action (its config's `default`, in protocols)
//     the second        the URI; none: /; without its leading /: it is added
//                       (a name relative to where the command is executed)
//     the rest          the arguments, a list, unnamed
// Throws when it is no command, or the action cannot be told.
export function interpret (command, protocols = {}) {
  const parts = typeof command === 'string' ? command.trim().split(/\s+/).filter(Boolean) : command
  if (!Array.isArray(parts) || !parts.length || parts.some(p => typeof p !== 'string' || !p)) throw new Error('not a command: its parts, <protocol>/<action> <URI> <arguments>')
  const [first, second, ...args] = parts
  const names = first.split('/')
  if (names.length > 2 || names.some(n => !n)) throw new Error(`not a command: ${first} (<protocol>/<action>)`)
  const [protocol, action = protocols?.[protocol]?.default] = names
  if (!action) throw new Error(`no action: ${first} (${protocol} has no default action)`)
  const uri = second === undefined ? '/' : second.startsWith('/') ? second : `/${second}`
  return { protocol, action, uri, args }
}

// A request's value, as it is given, made the form the mrepo works with:
// a command (a string, an array of parts, or { command }) interpreted, its
// protocol, action, URI and arguments beside it; a form given filled in
// ({ protocol, action, uri, args }) kept as it is.
export function formOf (value, protocols = {}) {
  if (typeof value === 'string' || Array.isArray(value)) value = { command: value }
  if (!value || typeof value !== 'object') return value
  if (value.command === undefined || value.protocol !== undefined) return value
  return { ...value, ...interpret(value.command, protocols) }
}

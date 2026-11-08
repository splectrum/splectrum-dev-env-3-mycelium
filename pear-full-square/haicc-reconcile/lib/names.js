// HAICC's names: each a URI part (a project's owner and its requirements'
// names become folders, and, in a swarm, parts of URIs). The same rule as
// the system's (rules.md: lowercase a-z, 0-9, words joined by single '-'),
// HAICC's own so that it runs on Node.js alone.
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const isName = s => typeof s === 'string' && NAME.test(s)

// The boundary: the name, or throws. `what` names it in the error.
export function validateName (s, what = 'name') {
  if (!isName(s)) throw new Error(`not a ${what}: ${s}`)
  return s
}

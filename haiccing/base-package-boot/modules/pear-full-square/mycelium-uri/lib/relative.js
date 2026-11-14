// A relative URI: as it is written in a request. No leading slash; relative
// to where its writer stands. `.` is the position itself; none given means
// `.`; `./x` is `x`. Its segments are our URIs' (lib/uri.js).
//   relative(uri)     the URI in its canonical form; throws when it is not
//                     one: a leading slash, a segment that is not a name,
//                     a form that is not canonical (uppercase, empty parts)
//   from(at, uri)     a URI written at a position, from that position's own
//                     start: from('main', 'host') -> main/host
//   within(at, uri)   the other way: the URI as written at the position,
//                     `.` the position itself; null when it is not at or
//                     below it
//   slashed(uri)      the slash-led path of it (`.` is /): for the code that
//                     still reads and writes by absolute paths
//   unslashed(path)   and back
import { validate } from './uri.js'

export const ROOT = '.'

export function relative (uri) {
  if (uri === undefined || uri === null || uri === '') return ROOT
  if (typeof uri !== 'string') throw new Error('not a URI: a string')
  if (uri.startsWith('/')) throw new Error(`not a relative URI: ${uri} (no leading slash: ${uri.replace(/^\/+/, '') || ROOT})`)
  let u = uri
  while (u.startsWith('./')) u = u.slice(2)
  if (u === '' || u === ROOT) return ROOT
  const c = validate(`/${u}`).slice(1)
  if (c !== u) throw new Error(`not canonical: ${uri} (${c || ROOT})`)
  return u
}
export const from = (at, uri) => (uri === ROOT ? at : at === ROOT ? uri : `${at}/${uri}`)
export const within = (at, uri) => (uri === at ? ROOT : at === ROOT ? uri : uri.startsWith(`${at}/`) ? uri.slice(at.length + 1) : null)
export const slashed = uri => (uri === ROOT ? '/' : `/${uri}`)
export const unslashed = path => (path === '/' ? ROOT : path.replace(/^\//, ''))

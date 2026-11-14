// A relative URI: as it is written in a request. No leading slash; relative
// to where its writer stands. `.` is the position itself; none given means
// `.`; `./x` is `x`. Its name parts are our URIs' (lib/uri.js); one may be
// `*`, for a URI that selects.
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
// A URI as data is an array of segments, each a relative URI of one or
// more name parts: the fixed chunks a URI is made of where it crossed a
// boundary (a layer's prefix, then the URI as it was written).
//   segmented(uri)    the array, checked: an array, at least one segment,
//                     each a relative URI in its canonical form; throws
//                     when it is not
//   joined(uri)       the one relative URI its segments make, from the
//                     first one's start: ['main', 'host'] -> main/host,
//                     ['main', '.'] -> main
//   positionOf(uri)   its segments without the ones that are `.`: where
//                     it points, as a prefix for what is written there
import { validate } from './uri.js'

export const ROOT = '.'

export function relative (uri) {
  if (uri === undefined || uri === null || uri === '') return ROOT
  if (typeof uri !== 'string') throw new Error('not a URI: a string')
  if (uri.startsWith('/')) throw new Error(`not a relative URI: ${uri} (no leading slash: ${uri.replace(/^\/+/, '') || ROOT})`)
  let u = uri
  while (u.startsWith('./')) u = u.slice(2)
  if (u === '' || u === ROOT) return ROOT
  const c = validate(`/${u}`, { star: true }).slice(1)
  if (c !== u) throw new Error(`not canonical: ${uri} (${c || ROOT})`)
  return u
}
export const from = (at, uri) => (uri === ROOT ? at : at === ROOT ? uri : `${at}/${uri}`)
export const within = (at, uri) => (uri === at ? ROOT : at === ROOT ? uri : uri.startsWith(`${at}/`) ? uri.slice(at.length + 1) : null)
export const slashed = uri => (uri === ROOT ? '/' : `/${uri}`)
export const unslashed = path => (path === '/' ? ROOT : path.replace(/^\//, ''))

export function segmented (uri) {
  if (!Array.isArray(uri) || !uri.length) throw new Error('not a URI: its segments, an array')
  for (const s of uri) {
    if (typeof s !== 'string' || s === '') throw new Error('not a URI: a segment is a string')
    const c = relative(s)
    if (c !== s) throw new Error(`not canonical: ${s} (${c})`)
  }
  return uri
}
export const joined = uri => uri.reduce(from, ROOT)
export const positionOf = uri => uri.filter(s => s !== ROOT)

// resolve: a local URI resolved to a node position in an mrepo, an ordinary
// node or a shortcut (README.md beside it).
import { join } from 'bare-path'
import { validate as canonical } from 'mycelium-uri'

// An mrepo's identity, in its runtime layer: { uri }, its unique URI,
// <swarm>/<node> (local/<name> for what the boot mrepo creates).
export const IDENTITY = '/runtime/mrepo.json'

// A position's shortcut, in the xpath layer: /host -> /xpath/host/shortcut.json.
export const shortcutOf = position => `/xpath${position === '/' ? '' : position}/shortcut.json`

// A position's folder in the shadow structure of main, relative to the
// mrepo's own folder: /host -> main/host. What is linked at the position
// sits there: an mrepo, its inbox and outbox folders inside.
export const shadowOf = position => join('main', ...position.split('/').filter(Boolean))

// The swarm of a unique URI: its first part; local when it has none.
export const swarmOf = uri => (typeof uri === 'string' && uri.includes('/') ? uri.split('/')[0] : 'local')

// The unique URI of an mrepo linked at a name, by the mrepo that links it:
// in the same swarm.
export const uriOf = (parent, name) => `${swarmOf(parent)}/${name}`

const parts = uri => uri.split('/').filter(Boolean)

export async function resolve (exec, uri) {
  const at = canonical(uri ?? '')
  if (at !== uri) throw new Error(`not canonical: ${uri} (${at})`)
  const segments = parts(at)
  const read = p => exec.read(p).then(b => JSON.parse(b.toString()), () => null)
  for (let i = 1; i <= segments.length; i++) {
    const position = '/' + segments.slice(0, i).join('/')
    const entry = await read(shortcutOf(position))
    if (!entry) continue
    // The simple rule: a URI stays inside its mrepo. One that runs through a
    // shortcut is not resolved: the way across is a goto at the shortcut.
    if (i < segments.length) throw new Error(`${position} is a shortcut: a URI does not run through it (haicc ${position} haicc /${segments.slice(i).join('/')} ...)`)
    const dir = exec.runtime?.dir ?? exec.dir ?? null
    return { at: position, shortcut: { at: position, ...entry, folder: shadowOf(position), dir: dir ? join(dir, shadowOf(position)) : null } }
  }
  return { at, shortcut: null }
}

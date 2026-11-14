// child(exec, uri): the child mrepo a boot action names: { name, at, dir,
// node, mrepo, recorded(), local() }; shared by the actions (not documented:
// a helper).
//   uri       the request's, its segments: ['main', '<name>']
//   at        its position as written at main: <name>
//   dir       its folder: in the shadow of main, at its position
//   node      its shortcut, in the xpath layer (no presence in main)
//   mrepo     its unique URI: in its parent's swarm, <swarm>/<name>
//   recorded  its shortcut, or null
//   local     whether its position exists locally: data in main there. The
//             boot protocol cannot target that: refuse() throws then
// A target is needed: main itself, or the root, is the mrepo, which one
// cannot deploy or tear down.
import { join } from 'bare-path'
import { segmented, joined, within, ROOT } from 'mycelium-uri'
import { shortcutOf, shadowOf, uriOf } from 'mrepo-base-xpath'

export function child (exec, segments) {
  if (segments === undefined || segmented(segments).at(-1) === ROOT) throw new Error('missing argument: target')
  const uri = joined(segments)
  if (uri === 'main') throw new Error('missing argument: target')
  const at = within('main', uri)
  if (at === null) throw new Error(`not a position in main: ${uri} (main/<name>)`)
  if (!/^[a-z][a-z0-9-]*$/.test(at)) throw new Error(`not a name for an mrepo: ${at} (one segment: lowercase letters, digits, hyphens)`)
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  const node = shortcutOf(at)
  const local = async () => (await exec.select(`/main/${at}`).catch(() => [])).length > 0
  return {
    name: at,
    at,
    dir: join(dir, shadowOf(at)),
    node,
    mrepo: uriOf(exec.runtime.uri, at),
    recorded: () => exec.read(node).then(b => JSON.parse(b.toString()), () => null),
    local,
    refuse: async () => { if (await local()) throw new Error(`${at} exists locally: the boot protocol cannot target it`) }
  }
}

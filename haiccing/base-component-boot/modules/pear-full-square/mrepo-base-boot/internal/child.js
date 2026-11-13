// child(exec, uri): the child mrepo a boot action names: { name, dir, node,
// mrepo, recorded(), local() }; shared by the actions (not documented: a
// helper).
//   dir       its folder: in the shadow of main, at its position
//   node      its shortcut, in the xpath layer (no presence in main)
//   mrepo     its unique URI: in its parent's swarm, <swarm>/<name>
//   recorded  its shortcut, or null
//   local     whether its position exists locally: data in main there. The
//             boot protocol cannot target that: refuse() throws then
// A target is needed: / is the mrepo itself, which one cannot deploy or
// tear down.
import { join } from 'bare-path'
import { shortcutOf, shadowOf, uriOf } from 'mrepo-base-xpath'

export function child (exec, uri) {
  if (uri === undefined || uri === '/') throw new Error('missing argument: target')
  const name = uri.slice(1)
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`not a name for an mrepo: ${uri} (one segment: lowercase letters, digits, hyphens)`)
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  const node = shortcutOf(uri)
  const local = async () => (await exec.select(`/main${uri}`).catch(() => [])).length > 0
  return {
    name,
    dir: join(dir, shadowOf(uri)),
    node,
    mrepo: uriOf(exec.runtime.uri, name),
    recorded: () => exec.read(node).then(b => JSON.parse(b.toString()), () => null),
    local,
    refuse: async () => { if (await local()) throw new Error(`${uri} exists locally: the boot protocol cannot target it`) }
  }
}

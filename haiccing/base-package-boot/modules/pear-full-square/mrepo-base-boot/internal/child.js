// child(exec, uri): the child mrepo a boot action names: { name, dir, node,
// mrepo, recorded() }; shared by the actions (not documented: a helper).
//   dir     its folder: in the shadow of main, at its position
//   node    its shortcut, in the xpath layer (no presence in main)
//   mrepo   its unique URI: in its parent's swarm, <swarm>/<name>
import { join } from 'bare-path'
import { shortcutOf, shadowOf, uriOf } from 'mrepo-base-xpath'

export function child (exec, uri) {
  const name = uri.slice(1)
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`not a child to deploy: ${uri}`)
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  const node = shortcutOf(uri)
  return { name, dir: join(dir, shadowOf(uri)), node, mrepo: uriOf(exec.runtime.uri, name), recorded: () => exec.read(node).then(b => JSON.parse(b.toString()), () => null) }
}

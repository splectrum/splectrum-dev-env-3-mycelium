// child(exec, uri): the child mrepo a boot action names (README.md beside it).
import { join } from 'bare-path'

export function child (exec, uri) {
  const name = uri.slice(1)
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`not a child to deploy: ${uri}`)
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  const node = `/main/${name}.json`
  return { name, dir: join(dir, 'main', name), node, recorded: () => exec.read(node).then(b => JSON.parse(b.toString()), () => null) }
}

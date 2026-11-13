// deactivate: protocol/deactivate / <protocol>, an active protocol made inactive (README.md beside it).
import { activeAt } from '../../internal/config.js'

export async function deactivate (exec, { args = [] }) {
  const [name] = args
  if (!name) throw new Error('missing argument: protocol')
  const there = await exec.read(activeAt(name)).then(() => true, () => false)
  if (!there) throw new Error(`not active: ${name}`)
  exec.remove(activeAt(name))
  return { deactivated: name }
}

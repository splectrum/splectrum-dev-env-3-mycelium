// activate: protocol/activate . <protocol>, a loaded protocol made active (README.md beside it).
import { activeAt } from '../../internal/config.js'

export async function activate (exec, { args = [] }) {
  const [name] = args
  if (!name) throw new Error('missing argument: protocol')
  const loaded = exec.runtime.protocols ?? {}
  if (!loaded[name]) throw new Error(`no protocol: ${name} (${Object.keys(loaded).sort().join(', ')})`)
  exec.put(activeAt(name), Buffer.from(JSON.stringify(loaded[name], null, 2) + '\n'))
  return { activated: name }
}

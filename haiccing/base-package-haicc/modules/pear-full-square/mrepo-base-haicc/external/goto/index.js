// goto: haicc <URI> <command>, the command that follows executed at a node
// position, or sent on where the node is a shortcut (README.md beside it).
import { resolve } from 'mrepo-base-xpath'

export async function goto (exec, { uri, args = [] }) {
  if (!args.length) throw new Error('missing argument: command')
  const to = await resolve(exec, uri)
  // a shortcut: the data originates elsewhere, the command goes there, as it is
  if (to.shortcut) return exec.forward(to.shortcut, args)
  // an ordinary node: executed here, in the context of the position
  if (to.at !== '/') throw new Error(`haicc ${uri}: a position inside main is not built yet (the root, or a shortcut)`)
  return exec.run(args)
}

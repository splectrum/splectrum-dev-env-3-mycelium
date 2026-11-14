// goto: haicc <URI> <command>, the command that follows executed at a node
// position, or sent on where the node is a shortcut (README.md beside it).
import { joined, positionOf } from 'mycelium-uri'
import { resolve } from 'mrepo-base-xpath'

// The positions a command is executed at for now: main's root, and the
// mrepo itself (its own commands).
const HERE = ['main', '.']

export async function goto (exec, { uri, args = [] }) {
  if (!args.length) throw new Error('missing argument: command')
  const to = await resolve(exec, uri)
  // a shortcut: the data originates elsewhere, the command goes there, as it is
  if (to.shortcut) return exec.forward(to.shortcut, args)
  // an ordinary node: executed here, in the context of the position: the
  // command that follows stands there, its URI read behind the position
  if (!HERE.includes(joined(uri))) throw new Error(`haicc ${to.at}: a position inside main is not built yet (the root, or a shortcut)`)
  return exec.run(args, { at: positionOf(uri) })
}

// delete: crud/delete <URI> [recurse], the nodes a URI selects made sure to
// be gone (README.md beside it). Exported as remove: delete is a word of
// the language.
import { place, select, folderOf } from '../../internal/node/index.js'

// Every file in a folder: its own only, or with everything below it.
async function files (exec, folder, deep) {
  const out = []
  for (const [path, n] of await exec.select(`${folder}/*`)) {
    if (n.type === 'blob') out.push(path)
    else if (deep) out.push(...await files(exec, path.replace(/^\//, ''), true))
  }
  return out
}

export async function remove (exec, { uri, args = [] }) {
  const other = args.filter(a => a !== 'recurse')
  if (other.length) throw new Error(`not an argument: ${other[0]} (recurse)`)
  const recurse = args.includes('recurse')
  const p = place(uri)
  if (!p.star && !p.names.length) throw new Error('missing argument: target')
  const found = await select(exec, p)
  // (all of them looked at before any is removed: one refused, none removed)
  for (const { names, node } of found) {
    if (node.children.length && !recurse) throw new Error(`${p.at(names)} has children: not deleted (crud/delete ${p.at(names)} recurse)`)
  }
  for (const { names } of found) for (const f of await files(exec, folderOf(p, names), recurse)) exec.remove(f)
  return found.map(({ node }) => ({ ...node, outcome: 'deleted' }))
}

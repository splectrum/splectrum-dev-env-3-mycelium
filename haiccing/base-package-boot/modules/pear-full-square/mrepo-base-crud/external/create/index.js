// create: crud/create <URI> <value>, a node made sure to exist (README.md beside it).
import { place, nodeAt, inside, folderOf, NODE } from '../../internal/node/index.js'

export async function create (exec, { uri, args = [] }) {
  const p = place(uri)
  if (p.star) throw new Error('crud create: one node, not a selection (*)')
  if (!p.names.length) throw new Error('missing argument: target')
  let value = {}
  if (args[0] !== undefined) { try { value = JSON.parse(args[0]) } catch { throw new Error(`not a document: ${args[0]} (JSON)`) } }
  await inside(exec, p, p.names)
  // the whole path: each node above it too, with an empty document; one
  // there already is left as it is, whatever value is given
  const made = new Set()
  for (let i = 1; i <= p.names.length; i++) {
    const names = p.names.slice(0, i)
    if (await nodeAt(exec, p, names)) continue
    exec.put(`${folderOf(p, names)}/${NODE}`, Buffer.from(JSON.stringify(i === p.names.length ? value : {}) + '\n'))
    made.add(i)
  }
  // (committed in the execution, so what was made is read back as stored)
  if (made.size) await exec.commit?.('created')
  const out = []
  for (let i = 1; i <= p.names.length; i++) out.push({ ...await nodeAt(exec, p, p.names.slice(0, i)), outcome: made.has(i) ? 'created' : 'there' })
  return out
}

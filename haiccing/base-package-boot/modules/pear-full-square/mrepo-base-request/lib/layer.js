// Records in a layer of the repository (a git branch): one JSON document a
// record, at the branch's root, <name>.json. Read from the repository as it
// stands; each write one commit, by the store's single writer (the runtime).
import * as json from 'mycelium-value-json'

export const AUTHOR = { name: 'mrepo', email: 'mrepo@localhost' }
// A layer's config (its mode, what it is for), committed with it when it is
// built from its structure: not one of its records.
export const CONFIG = 'layer'

// The names a layer's commits added, in the order of its commit chain (first
// parent, from its first commit to its head); within one commit, by name.
// Remembered per backend and layer: when the head moves, only the new commits
// are walked (back to the head walked last); the whole chain once, after a
// start.
const remembered = new WeakMap()
async function arrivals (backend, branch) {
  const head = Object.fromEntries(await backend.listBranches())[branch]
  if (!head) return []
  const memo = remembered.get(backend) ?? remembered.set(backend, new Map()).get(backend)
  const known = memo.get(branch)
  if (known?.head === head) return known.order
  const fresh = []
  let base = null
  for (let c = head; c;) {
    if (known && c === known.head) { base = known; break }
    const commit = await backend.readCommit(c)
    fresh.push(commit)
    c = commit.parents[0]
  }
  const namesOf = async tree => new Set((await backend.readTree(tree)).filter(e => e.type === 'blob' && e.name.endsWith('.json') && e.name !== `${CONFIG}.json`).map(e => e.name.slice(0, -'.json'.length)))
  const order = base ? [...base.order] : []
  let before = base ? base.names : new Set()
  for (const commit of fresh.reverse()) {
    const now = await namesOf(commit.tree)
    order.push(...[...now].filter(n => !before.has(n)).sort())
    before = now
  }
  memo.set(branch, { head, order, names: before })
  return order
}

export function layer ({ repo, writer, backend }, branch) {
  return {
    branch,
    // The names it holds, in the order they arrived (its commit chain).
    async arrived () {
      const here = new Set(await this.list())
      return [...new Set((await arrivals(backend, branch)).filter(n => here.has(n)))]
    },
    list: async () => (await repo.select(`/${branch}/*`))
      .filter(([p, n]) => n.type === 'blob' && p.endsWith('.json'))
      .map(([p]) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length)).filter(n => n !== CONFIG).sort(),
    read: async name => json.decode(await repo.read(`/${branch}/${name}.json`)),
    async put (name, value, message = `${name}`) {
      const c = await writer.change(branch)
      await c.put(`/${name}.json`, json.encode(value))
      return c.commit(message, { author: AUTHOR })
    },
    async remove (name, message = `${name} out`) {
      const c = await writer.change(branch)
      c.remove(`/${name}.json`)
      return c.commit(message, { author: AUTHOR })
    }
  }
}

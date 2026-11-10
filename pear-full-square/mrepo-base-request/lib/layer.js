// Records in a layer of the repository (a git branch): one JSON document a
// record, at the branch's root, <name>.json. Read from the repository as it
// stands; each write one commit, by the store's single writer (the runtime).
import * as json from 'mycelium-value-json'

export const AUTHOR = { name: 'mrepo', email: 'mrepo@localhost' }

export function layer ({ repo, writer }, branch) {
  return {
    branch,
    list: async () => (await repo.select(`/${branch}/*`))
      .filter(([p, n]) => n.type === 'blob' && p.endsWith('.json'))
      .map(([p]) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length)).sort(),
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

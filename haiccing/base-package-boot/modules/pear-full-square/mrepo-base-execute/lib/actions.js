// The rest actions, generic (not mounted by a package yet; the tests' own).
// Each takes the execution's context (exec:
// reads overlaid, writes to the execution branches, the runtime's context
// read through exec.runtime) and the request's value, and returns its value
// (or throws: refused).
import * as json from 'mycelium-value-json'
import { slashed, joined, ROOT } from 'mrepo-base-request'

const isJson = uri => uri.endsWith('.json')

const service = async exec => exec.read('/runtime/service.json').then(b => JSON.parse(b.toString()), () => ({ state: null }))

export const ACTIONS = {
  rest: {
    // A URI's value (from the mrepo's root, the layer first): the root the
    // repository at a glance; a JSON document its value; another file its
    // text (or its size); a folder or a branch its entries.
    async get (exec, { uri: segments }) {
      const given = joined(segments)
      const uri = slashed(given)
      if (given === ROOT) {
        const branches = (await exec.runtime.branches()).filter(b => !b.startsWith('execute/')).sort()
        const manifest = JSON.parse((await exec.read('/packages/manifest.json')).toString())
        return { repository: exec.runtime.name, service: (await service(exec)).state, layers: branches, packages: Object.keys(manifest.packages).sort() }
      }
      const found = await exec.select(uri)
      if (!found.length) throw new Error(`nothing at ${given}`)
      const [, node] = found[0]
      if (node.type === 'blob') {
        const bytes = await exec.read(uri)
        if (isJson(uri)) return json.decode(bytes)
        const text = bytes.toString('utf8')
        return bytes.length <= 4096 && !text.includes('�') ? { text } : { bytes: bytes.length }
      }
      return { entries: (await exec.select(uri === '/' ? '/*' : `${uri}/*`)).map(([p]) => p.slice(p.lastIndexOf('/') + 1)) }
    },
    // A JSON document put at a URI the caller names (created or replaced):
    // its first argument, the document as JSON text.
    async put (exec, { uri: segments, args = [] }) {
      const uri = joined(segments)
      exec.put(slashed(uri), json.encode(JSON.parse(args[0])))
      return { put: uri }
    },
    async delete (exec, { uri: segments }) {
      const uri = joined(segments)
      if (!(await exec.select(slashed(uri))).length) throw new Error(`nothing at ${uri}`)
      exec.remove(slashed(uri))
      return { deleted: uri }
    }
  }
}

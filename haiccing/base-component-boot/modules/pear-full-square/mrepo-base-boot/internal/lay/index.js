// lay({ store, sources, target, into }): a target package's list laid into a
// folder, the structure an mrepo is built from (README.md beside it).
import { mkdirSync, writeFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fetch, structureOf } from '../fetch/index.js'

// Runtime config: what a package drops into the runtime layer (its hooks,
// its service state, ...), not the layer's own definition.
export const isRuntimeConfig = p => p.startsWith('runtime/') && p !== 'runtime/layer.json'

export function lay ({ store, sources, target, into }) {
  // The target's list, in order, from its own structure.
  fetch({ store, sources, pkg: target })
  const listed = structureOf({ store, pkg: target })['packages/layer.json']
  if (!listed) throw new Error(`${target} lists no packages (mrepo/packages/layer.json)`)
  const list = JSON.parse(listed.toString()).packages || []
  // The package that defines the mrepo: the last in the list.
  const last = list[list.length - 1]
  for (const pkg of list) {
    // a documentation package (docs in its manifest entry): no structure,
    // its READMEs only (extracted into the help layer)
    if (fetch({ store, sources, pkg }).docs) continue
    for (const [p, bytes] of Object.entries(structureOf({ store, pkg }))) {
      if (p.endsWith('README.md')) continue // documentation: the help layer's, never a layer's
      // runtime config from the last package only: a package's own counts
      // only when it is itself the one deployed
      if (isRuntimeConfig(p) && pkg !== last) continue
      mkdirSync(dirname(join(into, p)), { recursive: true })
      writeFileSync(join(into, p), bytes)
    }
  }
  return { list }
}

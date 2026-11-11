// deploy(exec, { uri, body: { package } }): the boot protocol's deploy (README.md beside it).
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { start } from 'mrepo-base-runtime'
import { build } from '../../internal/build/index.js'
import { fetch } from '../../internal/fetch/index.js'
import { structureOf } from '../../internal/structure-of/index.js'
import { place } from '../../internal/place/index.js'
import { parseSource } from '../../internal/parse-source/index.js'
import { child } from '../../internal/child/index.js'

export async function deploy (exec, { uri, body }) {
  const c = child(exec, uri)
  if (await c.recorded()) throw new Error(`deployed already: ${uri}`)
  if (existsSync(c.dir)) throw new Error(`in the way: ${c.dir}`)
  const target = body?.package
  if (!target) throw new Error(`no package to deploy ${uri} from (the body's package)`)
  // The store and the sources: the mapping the parent's packages manifest records.
  const mine = await exec.read('/packages/manifest.json').then(b => JSON.parse(b.toString()), () => null)
  if (!mine?.store) throw new Error('no store: the parent\'s packages manifest names none')
  const store = mine.store
  const sources = (mine.sources || []).map(parseSource)
  // The target's list, in order, from its own structure.
  fetch({ store, sources, pkg: target })
  const listed = structureOf({ store, pkg: target })['packages/layer.json']
  if (!listed) throw new Error(`${target} lists no packages (mrepo/packages/layer.json)`)
  const list = JSON.parse(listed.toString()).packages || []
  // Each package's mrepo/ part laid in, in that order; built inside the parent.
  const tmp = mkdtempSync(join(tmpdir(), `deploy-${c.name}-`))
  try {
    for (const pkg of list) {
      // a package with no entry point is documentation: no structure, its
      // READMEs only (into the help layer, as its packages are placed)
      if (!(fetch({ store, sources, pkg }).entries ?? []).length) continue
      for (const [p, bytes] of Object.entries(structureOf({ store, pkg }))) {
        if (p.endsWith('README.md')) continue // documentation: the help layer's, never a layer's
        mkdirSync(dirname(join(tmp, p)), { recursive: true })
        writeFileSync(join(tmp, p), bytes)
      }
    }
    mkdirSync(dirname(c.dir), { recursive: true })
    const { layers } = await build({ from: tmp, dir: c.dir, setting: false })
    const { packages } = await place({ dir: c.dir, store, sources, list })
    const record = { name: c.name, package: target, packages: Object.keys(packages), dir: `main/${c.name}`, layers }
    // Its runtime started, from its own packages/ (its pinned runtime), by
    // its directory: its inbox operational. Not when it has no runtime.
    const runtime = join(c.dir, 'packages', 'haiccing', 'base-package-runtime.bundle')
    if (existsSync(runtime)) {
      const s = await start({ repo: c.dir, bundle: runtime })
      if (!s) throw new Error(`its runtime did not start: ${c.dir}`)
      record.runtime = { pid: s.pid }
    }
    exec.put(c.node, Buffer.from(JSON.stringify(record, null, 2) + '\n'))
    return { deployed: uri, ...record }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

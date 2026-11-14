// deploy(exec, { uri, args: [package] }): the boot protocol's deploy (README.md beside it).
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { start } from 'mrepo-base-runtime'
import { build } from '../../internal/build/index.js'
import { parseSource } from '../../internal/fetch/index.js'
import { lay } from '../../internal/lay/index.js'
import { place } from '../../internal/place/index.js'
import { child } from '../../internal/child.js'

// The organisation of a package named without one.
const ORG = 'haiccing'

export async function deploy (exec, { uri, args = [] }) {
  const c = child(exec, uri)
  if (await c.recorded()) throw new Error(`deployed already: ${c.at}`)
  // a position that exists locally (data in main there): not a target
  await c.refuse()
  if (existsSync(c.dir)) throw new Error(`in the way: ${c.dir}`)
  if (!args[0]) throw new Error('missing argument: package')
  // <org>/<package>; the package alone: ours
  const target = args[0].includes('/') ? args[0] : `${ORG}/${args[0]}`
  // The store and the sources: the mapping the parent's packages manifest records.
  const mine = await exec.read('/packages/manifest.json').then(b => JSON.parse(b.toString()), () => null)
  if (!mine?.store) throw new Error('no store: the parent\'s packages manifest names none')
  const store = mine.store
  const sources = (mine.sources || []).map(parseSource)
  // The target's list laid in: each package's mrepo/ part, in that order,
  // runtime config from the last only; built inside the parent.
  const tmp = mkdtempSync(join(tmpdir(), `deploy-${c.name}-`))
  try {
    const { list } = lay({ store, sources, target, into: tmp })
    // Its identity, in its runtime layer (where it has one): its unique URI.
    if (existsSync(join(tmp, 'runtime', 'layer.json'))) writeFileSync(join(tmp, 'runtime', 'mrepo.json'), JSON.stringify({ uri: c.mrepo }, null, 2) + '\n')
    mkdirSync(dirname(c.dir), { recursive: true })
    const { layers } = await build({ from: tmp, dir: c.dir, setting: false })
    const { packages } = await place({ dir: c.dir, store, sources, list })
    // What is local to this machine about it: not in main, which replicates.
    const record = { package: target, packages: Object.keys(packages), layers }
    // Its runtime started, from its own packages/ (its pinned runtime), by
    // its directory: its inbox operational. Not when it has no runtime.
    const runtime = join(c.dir, 'packages', 'haiccing', 'base-package-runtime.bundle')
    if (existsSync(runtime)) {
      const s = await start({ repo: c.dir, bundle: runtime })
      if (!s) throw new Error(`its runtime did not start: ${c.dir}`)
      record.runtime = { pid: s.pid }
    }
    // Its node, in main, and beside it its shortcuts: the link, only that.
    exec.put(c.node, Buffer.from('{}\n'))
    exec.put(c.links, Buffer.from(JSON.stringify([{ mrepo: c.mrepo }], null, 2) + '\n'))
    exec.put(c.local, Buffer.from(JSON.stringify(record, null, 2) + '\n'))
    return { deployed: c.at, mrepo: c.mrepo, ...record }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

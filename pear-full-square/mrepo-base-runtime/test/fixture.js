// A booted host for the tests, as the boot leaves it (haicc-base-boot): the
// repository `host`, its layers, its packages (a manifest; a HAICC bundle
// carrying its API, /api.json), the runtime's data booted, the pending queue
// preloaded with service initialise /. Without a setup: written directly.
import { readFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import Bundle from 'bare-bundle'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { writer } from 'mycelium-git'
import { record, PENDING } from 'mrepo-base-request'

const here = dirname(fileURLToPath(import.meta.url))
const author = { name: 'test', email: 'test@localhost' }
export const API = JSON.parse(readFileSync(join(here, '..', '..', '..', 'haiccing', 'base-package-haicc', 'api.json')))

export async function bootedHost (work, { preload = true } = {}) {
  const store = await openStore({ storage: join(work, 'store') })
  try {
    const host = await mrepos({ store }).create('host')
    const w = writer(host.backend)
    for (const l of ['main', 'packages', 'runtime', 'request/pending/default', 'request/execute', 'request/done']) await w.createLayer(l, `Create ${l}`, { author })
    const bundle = new Bundle()
    bundle.write('/api.json', JSON.stringify(API))
    const p = await w.change('packages')
    await p.put('/manifest.json', Buffer.from(JSON.stringify({ sequence: 1, packages: { 'haiccing/base-package-haicc': {}, 'haiccing/base-package-mrepo': {} } })))
    await p.put('/haiccing/base-package-haicc.bundle', bundle.toBuffer())
    await p.commit('Installed', { author })
    const r = await w.change('runtime')
    await r.put('/service.json', Buffer.from(JSON.stringify({ state: 'booted', type: 'haicc', package: 'haiccing/base-package-haicc' })))
    await r.commit('Booted', { author })
    if (preload) {
      const q = await w.change(PENDING)
      await q.put('/0000000000001-00000000.json', Buffer.from(JSON.stringify(record(`/${PENDING}`, { api: 'haicc', protocol: 'service', action: 'initialise', uri: '/' }, { mrepo: { origin: 'boot' } }))))
      await q.commit('Preloaded', { author })
    }
    return host
  } finally { await store.close() }
}

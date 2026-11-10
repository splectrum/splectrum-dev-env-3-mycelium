// A booted repository for the tests, as a boot leaves it: the repository
// `host`, its layers, its packages (a manifest; a HAICC bundle carrying its
// API, /api.json), the runtime's data booted, the pending queue preloaded
// with service initialise /. Without a setup: written directly. On the p2p
// layer (as haicc-base-boot leaves the host) or on native git (storage:
// 'git': a bare repository, <work>/mrepos/host/.git, and <work>/mrepo.json).
// And an input's request, as HAICC's input sends it, its answer read.
import fs, { writeFileSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import Bundle from 'bare-bundle'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { writer, openRepo, nativeBackend, p2pgitBackend } from 'mycelium-git'
import { newName } from 'mycelium-container-document'
import { record, post, inboxFolder, setting, gitdirOf, PENDING } from 'mrepo-base-request'

const author = { name: 'test', email: 'test@localhost' }
// The test's type: haicc, as its package declares it (haiccing/base-package-haicc/api.json),
// the tests' own copy (a module's tests run inside its packages too).
export const API = {
  api: 'haicc',
  types: [
    { uri: '/', protocols: { service: ['initialise', 'start', 'stop', 'shutdown'], rest: ['get'] } },
    { uri: '/main', deep: true, protocols: { rest: ['get', 'put', 'delete'] } },
    { uri: '/runtime', deep: true, protocols: { rest: ['get'] } },
    { uri: '/packages', deep: true, protocols: { rest: ['get'] } },
    { uri: '/request', deep: true, protocols: { rest: ['get'] } }
  ]
}

async function layers (backend, { preload }) {
  const w = writer(backend)
  for (const l of ['main', 'packages', 'runtime', 'inbox', 'outbox', 'request/pending/default', 'request/execute', 'request/done']) await w.createLayer(l, `Create ${l}`, { author })
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
}

export async function bootedHost (work, { preload = true, storage = 'p2p' } = {}) {
  if (storage === 'git') {
    writeFileSync(join(work, 'mrepo.json'), JSON.stringify({ storage: 'git', name: 'host' }) + '\n')
    const backend = nativeBackend(gitdirOf(work, 'host'))
    await backend.init()
    await layers(backend, { preload })
    return { name: 'host', id: null }
  }
  const store = await openStore({ storage: join(work, 'store') })
  try {
    const host = await mrepos({ store, local: join(work, 'mrepos') }).create('host')
    await layers(host.backend, { preload })
    return host
  } finally { await store.close() }
}

// A request, as HAICC's input sends it (native git: committed into the
// inbox; p2p: a file in the inbox folder), its answer read from the outbox
// layer; null when none came.
export async function send (work, value, { wait = 10000 } = {}) {
  const { storage, name } = setting(work)
  const disk = storage === 'git' ? nativeBackend(gitdirOf(work, name)) : p2pgitBackend(gitdirOf(work, name), { fs })
  const rec = record('/inbox', { api: 'haicc', ...value }, { mrepo: { from: null } })
  let id
  if (storage === 'git') { id = newName(); await post({ work, backend: disk, writer: writer(disk), repo: openRepo(disk) }, rec, id) } else id = inboxFolder(work).add(rec)
  const repo = openRepo(disk)
  for (const end = Date.now() + wait; Date.now() < end;) {
    const answer = await repo.read(`/outbox/${id}.json`).then(b => JSON.parse(b.toString()), () => null)
    if (answer) return answer.value
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return null
}

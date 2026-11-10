// p2p-mrepo — mycelium repositories on the p2p layer. Each is a drive in a
// p2p-store with p2p-git on it, given to its users as a mycelium backend
// (mycelium-git's backend contract): mycelium works with it and knows
// nothing of p2p.
//   const repos = mrepos({ store, observer, local })  store: p2p-store's;
//                                                 local: a folder for the
//                                                 repositories' disk sides
//                                                 (<local>/<name>/.git: their
//                                                 non-atomic layers, mycelium-git's
//                                                 mixedBackend), else all in the store
//   await repos.create(name, { id })              a new repository, the store's own
//                                                 (id: its internal id, if it has one
//                                                 already, e.g. rebuilt; else a new GUID)
//   await repos.import(name, { native | bundle }) one from the boundary
//   await repos.clone(repo, name, { id })         a copy under a new key, its origin recorded
//   await repos.open(name)                        one of the store's own, again
//   await repos.replica(key)                      another's, by key: read only
//   await repos.list()                            what the store holds as its own
// A repository is { name, id, key, drive, backend }. Its internal id (a
// GUID) and origin are recorded inside it (`/mrepo.json`, next to the git
// directory at the drive's root), so a copy anywhere says what it is. The
// store's own repositories are listed in a registry, a drive of its own,
// so they are opened again on start.
//
// Instrumentation (the series' contract): repo-created, repo-imported,
// repo-cloned, repo-opened, replica-opened; keys, ids, names and counts,
// never a secret.

import crypto from 'hypercore-crypto'
import { createFs } from 'p2p-git/hyperdrive-fs'
import { join } from 'bare-path'
import fs from 'bare-fs'
import { p2pgitBackend, nativeBackend, mixedBackend, transfer, readBundle } from '../mycelium-git/index.js'

const MODULE = 'p2p-mrepo'
const hex = b => b.toString('hex')
const guid = (bytes = crypto.randomBytes(16)) => {
  const h = hex(bytes)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${'89ab'[parseInt(h[16], 16) % 4]}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export function mrepos ({ store, observer = null, local = null }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })
  let registry = null
  const reg = async () => (registry ??= await store.own('mrepo-registry'))
  // Open repositories, by name: a drive's db core is an exclusive session,
  // so a repository open in this store is given again, not opened twice.
  const opened = new Map()
  const driveBackend = drive => p2pgitBackend('/', { fs: createFs(drive) })
  // A repository's backend: its drive, and its disk side when there is a
  // folder for it (made the first time).
  async function backendOf (drive, name) {
    if (!local || !name) return driveBackend(drive)
    const gitdir = join(local, name, '.git')
    const disk = p2pgitBackend(gitdir, { fs })
    if (!fs.existsSync(join(gitdir, 'HEAD'))) { fs.mkdirSync(gitdir, { recursive: true }); await disk.init() }
    return mixedBackend({ atomic: driveBackend(drive), local: disk })
  }
  const readInfo = async drive => JSON.parse((await drive.get('/mrepo.json')).toString())

  async function create (name, { origin = null, id = null } = {}) {
    const r = await reg()
    if (await r.entry(`/repos/${name}.json`)) throw new Error(`exists: ${name}`)
    const drive = await store.own(`mrepo/${name}`)
    await driveBackend(drive).init()
    const backend = await backendOf(drive, name)
    const info = { name, id: id || guid(), key: hex(drive.key), origin }
    await drive.put('/mrepo.json', Buffer.from(JSON.stringify(info, null, 2) + '\n'))
    await r.put(`/repos/${name}.json`, Buffer.from(JSON.stringify(info) + '\n'))
    emit('repo-created', { name, id: info.id, resource: info.key, origin: origin && origin.kind })
    const repo = { ...info, drive, backend }
    opened.set(name, repo)
    return repo
  }

  // Every branch of `from` (a backend) into `to`, with their history.
  async function copyBranches (from, to) {
    const branches = await from.listBranches()
    let objects = 0
    for (const [branch, oid] of branches) {
      objects += await transfer(from, to, oid)
      await to.updateBranch(branch, oid, null)
    }
    return { branches: branches.length, objects }
  }

  return {
    create: (name, { id = null } = {}) => create(name, { id }),

    async import (name, { native = null, bundle = null }) {
      if (!native === !bundle) throw new Error('import takes a native repository or a bundle')
      const origin = native
        ? { kind: 'native', path: native }
        : { kind: 'bundle', blake2b: hex(crypto.hash(bundle)), bytes: bundle.length }
      const repo = await create(name, { origin })
      let counts
      if (native) {
        counts = await copyBranches(nativeBackend(native), repo.backend)
      } else {
        const { branches, objects } = await readBundle(repo.backend, bundle)
        for (const [branch, oid] of Object.entries(branches)) await repo.backend.updateBranch(branch, oid, null)
        counts = { branches: Object.keys(branches).length, objects }
      }
      emit('repo-imported', { name, id: repo.id, resource: repo.key, from: origin.kind, ...counts })
      return { ...repo, ...counts }
    },

    async clone (from, name, { id = null } = {}) {
      const branches = Object.fromEntries(await from.backend.listBranches())
      const repo = await create(name, { id, origin: { kind: 'clone', id: from.id, key: from.key, branches } })
      const counts = await copyBranches(from.backend, repo.backend)
      emit('repo-cloned', { name, id: repo.id, resource: repo.key, fromId: from.id, fromResource: from.key, ...counts })
      return { ...repo, ...counts }
    },

    async open (name) {
      if (opened.has(name) && !opened.get(name).drive.closed) return opened.get(name)
      const r = await reg()
      if (!await r.entry(`/repos/${name}.json`)) throw new Error(`no repository: ${name}`)
      const drive = await store.own(`mrepo/${name}`)
      const info = await readInfo(drive)
      emit('repo-opened', { name, id: info.id, resource: info.key })
      const repo = { ...info, drive, backend: await backendOf(drive, name) }
      opened.set(name, repo)
      return repo
    },

    // Another store's repository, by key: read only, loaded lazily by
    // replication (p2p-replicate). `info()` reads its name and id.
    async replica (key) {
      const drive = await store.replica(key)
      emit('replica-opened', { resource: hex(drive.key) })
      return { key: hex(drive.key), drive, backend: driveBackend(drive), info: () => readInfo(drive) }
    },

    async list () {
      const r = await reg()
      const found = []
      for await (const entry of r.list('/repos')) found.push(JSON.parse((await r.get(entry.key)).toString()))
      return found.sort((a, b) => a.name.localeCompare(b.name))
    }
  }
}

// A stable id from bytes (16 or more): for a repository whose identity
// follows from something permanent, e.g. its owner's key and its name.
export function idFrom (bytes) {
  return guid(bytes.subarray(0, 16))
}

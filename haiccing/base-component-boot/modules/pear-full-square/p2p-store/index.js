// p2p-store — local storage for the p2p layer: one Corestore and the
// resources in it (Hyperdrives), with no peer needed.
//   const store = await openStore({ storage, primaryKey, observer, readOnly })
//     readOnly: no lock taken, nothing written: a short-lived reader beside
//     the store's one writer, seeing what was written before it opened
//   store.own(name)          a drive of this store's own, its keypair derived
//                            from the primary key and the name
//   store.withKeyPair(kp)    a drive written with an explicit keypair (one
//                            that can move to another store)
//   store.replica(key)       another store's drive, opened by its key: read
//                            only, filled by replication (p2p-replicate)
//   store.resources()        every drive opened, with its sizes
//   await store.close()
//
// The Corestore writes its primary key and its cores' secret keys into its
// storage, in clear, and reopens writable with no key given (step 0,
// probe corestore-secrets): the application places `storage` in RAM (a
// tmpfs) unless the store may hold its secrets on disk.
//
// Instrumentation: every resource opened, created or closed is an event
// to the observer, { module, kind, time, ...facts }; facts are keys and
// sizes, never a secret.

import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import Hyperdrive from 'hyperdrive'

const MODULE = 'p2p-store'

export async function openStore ({ storage, primaryKey = null, observer = null, readOnly = false }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })
  const corestore = new Corestore(storage, { ...(primaryKey ? { primaryKey, unsafe: true } : {}), ...(readOnly ? { readOnly: true } : {}) })
  await corestore.ready()
  const drives = new Map() // hex key -> { drive, how, name }
  emit('store-opened', { primaryKeyGiven: !!primaryKey })

  async function track (drive, how, name = null) {
    await drive.ready()
    const key = drive.key.toString('hex')
    drives.set(key, { drive, how, name })
    emit('resource-opened', { resource: key, how, name, writable: drive.writable, length: drive.core.length })
    drive.core.once('close', () => {
      if (drives.get(key)?.drive === drive) drives.delete(key)
    })
    return drive
  }

  return {
    corestore,
    // A drive of this store's own: the same name always gives the same
    // drive (its keypair derived from the primary key, in a namespace).
    own: name => track(new Hyperdrive(corestore.namespace(name)), 'own', name),
    // A drive on a db core opened with an explicit keypair, given to
    // Hyperdrive as its db (Hyperdrive takes no keypair option; `_db` is its
    // internal one, checked with hyperdrive 13.3.4). Its blobs core is
    // signed with the same keypair. The drive's key is derived from a
    // manifest naming the keypair's public key.
    withKeyPair: keyPair => {
      const core = corestore.get({ keyPair, exclusive: true })
      const db = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json', metadata: { contentFeed: null } })
      return track(new Hyperdrive(corestore, { _db: db }), 'keypair')
    },
    replica: key => track(new Hyperdrive(corestore, typeof key === 'string' ? Buffer.from(key, 'hex') : key), 'replica'),
    // What each drive holds: its length, what is held from the start
    // (contiguous) and its bytes, for the db and the blobs core.
    resources () {
      return [...drives].map(([key, { drive, how, name }]) => ({
        resource: key,
        how,
        name,
        writable: drive.writable,
        db: sizes(drive.core),
        blobs: drive.blobs ? sizes(drive.blobs.core) : null
      }))
    },
    async close () {
      for (const { drive } of [...drives.values()]) await drive.close()
      await corestore.close()
      emit('store-closed', {})
    }
  }
}

const sizes = core => ({ length: core.length, contiguous: core.contiguousLength, bytes: core.byteLength })

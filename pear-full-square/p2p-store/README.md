# p2p-store

Local storage for the p2p layer: one Corestore and the resources in it
(Hyperdrives). No peer is needed. One of the p2p series (`p2p-store`,
`p2p-dht`, `p2p-connect`, `p2p-replicate`, `p2p-channel`, `p2p-git`),
composed by the application; no module of the series knows another.

```js
import { openStore } from 'p2p-store'
const store = await openStore({ storage, primaryKey, observer })
const repo = await store.own('repo')          // derived: the same name, the same drive
const moving = await store.withKeyPair(kp)    // an explicit keypair: the drive can move
const replica = await store.replica(key)      // another store's drive, read only
store.resources()                             // every drive opened, with its sizes
await store.close()
```

- **The store holds its secrets.** Corestore writes its primary key and its
  cores' secret keys into its storage, in clear, and reopens writable with
  no key given. Place `storage` in RAM (a tmpfs) unless the store may hold
  its secrets on disk. `primaryKey` is given (from a vault), not generated.
- **Own drives** are derived from the primary key and a name (a
  namespace): the same primary key and name give the same drive, in any
  storage.
- **An explicit keypair** opens the drive's db core with it; its blobs
  core is signed with the same keypair. The drive's key is derived from a
  manifest naming the keypair's public key (not the public key itself).
  This uses Hyperdrive's internal `_db` option (hyperdrive 13.3.4): check
  it when Hyperdrive is upgraded.
- **Replicas** are filled by replication (`p2p-replicate`), lazily.

**Instrumentation** (the series' contract: an observer receiving
`{ module, kind, time, ...facts }`, never a secret): `store-opened`,
`resource-opened` (key, how, name, writable, length), `store-closed`.
Metrics: `resources()`.

`npm test`: 5 tests.

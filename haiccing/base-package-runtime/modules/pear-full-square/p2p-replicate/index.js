// p2p-replicate — replication for the p2p layer: moving data between
// stores, over any stream, with its accounting.
//   const rep = replicator({ store, observer })    store: p2p-store's
//   rep.replicate(stream, { peer })   the whole store replicated over the
//                                      stream (a connection, a pipe, a
//                                      socket); peer names the other side
//   rep.track(drive)                   count what moves for this drive,
//                                      per peer, both ways
//   await rep.hold(drive)              take the drive whole: a store that
//                                      serves or takes over a drive holds
//                                      all of it (a replica holds only what
//                                      it has read)
//   rep.metrics()
//
// A peer that knows a resource's key can ask for it: which resources may
// replicate to which peers (policy) is not decided here yet; Corestore
// serves any core it holds. To be added when membership needs it.
//
// Instrumentation: { module, kind, time, ...facts } to the observer:
// replication-started, replication-ended, held; metrics: blocks and bytes
// uploaded and downloaded, per resource and peer.

const MODULE = 'p2p-replicate'
const hex = b => (b ? b.toString('hex') : null)

export function replicator ({ store, observer = null }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })
  const counts = new Map() // `${resource} ${core} ${peer}` -> { up, upBytes, down, downBytes }
  const tracked = new Set()

  function count (resource, part, direction) {
    return (index, bytes, from) => {
      const peer = hex(from?.remotePublicKey) || 'unknown'
      const k = `${resource} ${part} ${peer}`
      const c = counts.get(k) || { resource, part, peer, uploaded: { blocks: 0, bytes: 0 }, downloaded: { blocks: 0, bytes: 0 } }
      c[direction].blocks++
      c[direction].bytes += bytes
      counts.set(k, c)
    }
  }
  function watchCore (resource, part, core) {
    core.on('upload', count(resource, part, 'uploaded'))
    core.on('download', count(resource, part, 'downloaded'))
  }

  return {
    replicate (stream, { peer = null } = {}) {
      const p = peer || hex(stream.remotePublicKey) || null
      const s = store.corestore.replicate(stream)
      emit('replication-started', { peer: p })
      s.once('close', () => emit('replication-ended', { peer: p }))
      return s
    },
    track (drive) {
      const resource = hex(drive.key)
      if (tracked.has(resource)) return
      tracked.add(resource)
      watchCore(resource, 'db', drive.core)
      if (drive.blobs) watchCore(resource, 'blobs', drive.blobs.core)
      else drive.once('blobs', blobs => watchCore(resource, 'blobs', blobs.core))
    },
    async hold (drive) {
      const t0 = Date.now()
      await drive.ready()
      await drive.update({ wait: true })
      const blobs = await drive.getBlobs()
      const before = drive.core.contiguousLength + blobs.core.contiguousLength
      await drive.core.download({ start: 0, end: drive.core.length }).done()
      await blobs.core.download({ start: 0, end: blobs.core.length }).done()
      const facts = {
        resource: hex(drive.key),
        db: { length: drive.core.length, bytes: drive.core.byteLength },
        blobs: { length: blobs.core.length, bytes: blobs.core.byteLength },
        blocksFetched: drive.core.length + blobs.core.length - before,
        ms: Date.now() - t0
      }
      emit('held', facts)
      return facts
    },
    metrics: () => [...counts.values()].map(c => ({ ...c, uploaded: { ...c.uploaded }, downloaded: { ...c.downloaded } }))
  }
}

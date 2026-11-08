import test from 'brittle'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openStore } from 'p2p-store'
import { replicator } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-replicate-'))

test('over a direct stream: read lazily, counted per peer, then held whole', async (t) => {
  const events = []
  const observer = e => events.push(e)
  const a = await openStore({ storage: dir() })
  const b = await openStore({ storage: dir() })
  const drive = await a.own('repo')
  for (let i = 0; i < 20; i++) await drive.put(`/f${i}`, Buffer.alloc(1000, i))
  const ra = replicator({ store: a, observer })
  const rb = replicator({ store: b, observer })
  ra.track(drive)
  const sa = ra.replicate(true)
  const sb = rb.replicate(false)
  sa.pipe(sb).pipe(sa)

  const replica = await b.replica(drive.key)
  rb.track(replica)
  await replica.update({ wait: true })
  t.is((await replica.get('/f3')).length, 1000)
  const lazy = b.resources().find(r => r.how === 'replica')
  t.ok(lazy.db.contiguous < lazy.db.length, 'only what was read')

  const down = rb.metrics().filter(m => m.downloaded.blocks > 0)
  t.ok(down.length >= 1)
  t.ok(down.every(m => /^[0-9a-f]{64}$/.test(m.peer)), 'each counted against the peer key')
  const blobsDown = down.find(m => m.part === 'blobs')
  t.is(blobsDown.downloaded.bytes, 1000, 'one file')
  const up = ra.metrics().find(m => m.part === 'blobs')
  t.is(up.uploaded.bytes, 1000)

  const held = await rb.hold(replica)
  t.is(held.db.length, replica.core.length)
  const whole = b.resources().find(r => r.how === 'replica')
  t.is(whole.db.contiguous, whole.db.length)
  t.is(whole.blobs.contiguous, whole.blobs.length)

  await a.close()
  await b.close()
  const kinds = events.map(e => e.kind)
  t.ok(kinds.includes('replication-started') && kinds.includes('held'))
})

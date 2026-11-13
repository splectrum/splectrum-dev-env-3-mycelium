import test from 'brittle'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import crypto from 'hypercore-crypto'
import { openStore } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-store-'))

test('own drives: the same name gives the same drive, another name another', async (t) => {
  const storage = dir()
  const primaryKey = crypto.randomBytes(32)
  let store = await openStore({ storage, primaryKey })
  const a = await store.own('a')
  await a.put('/x', Buffer.from('1'))
  const keyA = a.key.toString('hex')
  const b = await store.own('b')
  t.not(b.key.toString('hex'), keyA)
  await store.close()

  store = await openStore({ storage, primaryKey })
  const again = await store.own('a')
  t.is(again.key.toString('hex'), keyA)
  t.is(again.writable, true)
  t.is(String(await again.get('/x')), '1')
  await store.close()
})

test('the same primary key in another storage gives the same own drives', async (t) => {
  const primaryKey = crypto.randomBytes(32)
  const s1 = await openStore({ storage: dir(), primaryKey })
  const s2 = await openStore({ storage: dir(), primaryKey })
  t.is((await s1.own('a')).key.toString('hex'), (await s2.own('a')).key.toString('hex'))
  await s1.close()
  await s2.close()
})

test('an explicit keypair gives the same writable drive in any store', async (t) => {
  const keyPair = crypto.keyPair()
  const s1 = await openStore({ storage: dir() })
  const s2 = await openStore({ storage: dir() })
  const d1 = await s1.withKeyPair(keyPair)
  const d2 = await s2.withKeyPair(keyPair)
  t.is(d1.key.toString('hex'), d2.key.toString('hex'))
  t.is(d1.writable, true)
  t.is(d2.writable, true)
  await d1.put('/x', Buffer.from('1'))
  t.is((await d1.getBlobs()).core.writable, true)
  await s1.close()
  await s2.close()
})

test('a replica is opened by key, read only, empty until replicated', async (t) => {
  const s1 = await openStore({ storage: dir() })
  const own = await s1.own('a')
  await own.put('/x', Buffer.from('1'))
  const s2 = await openStore({ storage: dir() })
  const replica = await s2.replica(own.key.toString('hex'))
  t.is(replica.writable, false)
  t.is(replica.core.length, 0)
  await s1.close()
  await s2.close()
})

test('resources and events: keys and sizes, never a secret', async (t) => {
  const events = []
  const primaryKey = crypto.randomBytes(32)
  const store = await openStore({ storage: dir(), primaryKey, observer: e => events.push(e) })
  const keyPair = crypto.keyPair()
  const own = await store.own('a')
  await own.put('/x', Buffer.from('hello'))
  await store.withKeyPair(keyPair)
  const listed = store.resources()
  t.is(listed.length, 2)
  const a = listed.find(r => r.name === 'a')
  t.is(a.how, 'own')
  t.is(a.db.length, 2)
  t.is(a.blobs.bytes, 5)
  await store.close()

  t.alike(events.map(e => e.kind), ['store-opened', 'resource-opened', 'resource-opened', 'store-closed'])
  t.ok(events.every(e => e.module === 'p2p-store' && typeof e.time === 'number'))
  const text = JSON.stringify(events)
  for (const secret of [primaryKey, keyPair.secretKey, own.core.keyPair?.secretKey].filter(Boolean)) {
    t.ok(!text.includes(secret.toString('hex')), 'no secret in the events')
  }
})

// Clients speak to the server through topics (notes/splectral.md, running
// Splectral): each client produces its actions into a topic of its own,
// `<runs>/clients/<client>/actions` (one producer per partition), with a
// correlation id in a header. The server follows every client's topic from
// its committed offset, dispatches each action, and the result goes into
// the server's `<runs>/actions` topic with the same correlation id, where
// the client finds it. An action produced while the server is down waits
// for it.
//   const c = await followClients({ runs, dispatch })
//   await c.submit(client, action)   for clients in this process (the HTTP adapter)
//   c.stop()
import { existsSync, readdirSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import crypto from 'bare-crypto'
import { openTopic, committedOffsets, folderStorage } from '../../mycelium-topic/index.js'

export const correlationOf = record => (record.headers || []).find(h => h.key === 'correlation')?.value ?? null

export async function followClients ({ runs, dispatch, every = 250 }) {
  const root = join(runs, 'clients')
  mkdirSync(root, { recursive: true })
  const followed = new Map() // client -> stop
  const waiters = new Map() // correlation -> { resolve, reject }
  const producers = new Map() // client -> topic, for clients in this process
  let stopped = false

  async function follow (client) {
    const topic = await openTopic({ storage: folderStorage(join(root, client, 'actions')) })
    const committed = await committedOffsets({ storage: folderStorage(join(root, client, 'committed')) })
    const from = (await committed.committed()) ?? 0
    // One action at a time per client, in order.
    const stop = topic.follow(from, async records => {
      for (const r of records) {
        const correlation = correlationOf(r) || `${client}:${r.offset}`
        let out
        try { out = { ok: true, result: await dispatch(r.value, { client, correlation }) } } catch (err) { out = { ok: false, error: err.message } }
        await committed.commit(r.offset + 1)
        const w = waiters.get(correlation)
        if (w) { waiters.delete(correlation); w.resolve(out) }
      }
    }, { every })
    followed.set(client, stop)
  }

  async function scan () {
    if (stopped) return
    for (const client of existsSync(root) ? readdirSync(root).sort() : []) {
      if (!followed.has(client) && existsSync(join(root, client, 'actions'))) await follow(client)
    }
  }
  await scan()
  const timer = setInterval(() => scan().catch(() => {}), every * 4)

  return {
    async submit (client, action) {
      let topic = producers.get(client)
      if (!topic) { topic = await openTopic({ storage: folderStorage(join(root, client, 'actions')) }); producers.set(client, topic) }
      const correlation = `${client}:${crypto.randomUUID()}`
      const answer = new Promise((resolve, reject) => waiters.set(correlation, { resolve, reject }))
      await topic.produce({ value: action, headers: [{ key: 'correlation', value: correlation }] })
      if (!followed.has(client)) await scan()
      return answer
    },
    stop () {
      stopped = true
      clearInterval(timer)
      for (const stop of followed.values()) stop()
      for (const w of waiters.values()) w.reject(new Error('the server stopped'))
    }
  }
}

// p2p-channel — messages and requests on a p2p connection, not stored:
// what passes on a channel is gone once delivered (the secret handover,
// requests answered in code).
//   const ch = openChannel(stream, { name, onmessage, onrequest, observer, peer })
//   await ch.opened          once the other side has opened the same name
//   ch.send(body)            a message (JSON)
//   await ch.request(body)   a request; resolves with the other side's answer
//   ch.close()
//
// `stream` is an encrypted connection (p2p-connect's), or any stream
// Protomux can run on; channels share it with replication. `onrequest(body)`
// returns (or resolves to) the answer; `onmessage(body)` takes a message.
//
// Instrumentation: { module, kind, time, ...facts } to the observer:
// channel-opened, channel-closed, message (direction, type, bytes),
// request-failed. Never the content: a message may carry a secret.

import Protomux from 'protomux'
import c from 'compact-encoding'

const MODULE = 'p2p-channel'

export function openChannel (stream, { name, onmessage = null, onrequest = null, observer = null, peer = null }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), channel: name, peer, ...facts })
  const mux = Protomux.from(stream)
  const pending = new Map()
  let nextId = 1
  let resolveOpened, rejectOpened
  const opened = new Promise((resolve, reject) => { resolveOpened = resolve; rejectOpened = reject })
  opened.catch(() => {})

  const channel = mux.createChannel({
    protocol: `p2p-channel/${name}`,
    onopen () { emit('channel-opened', {}); resolveOpened() },
    onclose () {
      emit('channel-closed', { pending: pending.size })
      rejectOpened(new Error('channel closed'))
      for (const { reject } of pending.values()) reject(new Error('channel closed'))
      pending.clear()
    }
  })
  if (!channel) throw new Error(`channel ${name} is already open on this stream`)

  const message = channel.addMessage({
    encoding: c.json,
    async onmessage (m) {
      emit('message', { direction: 'in', type: m.type, bytes: size(m) })
      if (m.type === 'message') {
        if (onmessage) await onmessage(m.body)
      } else if (m.type === 'request') {
        let reply
        try {
          reply = { type: 'reply', id: m.id, body: onrequest ? await onrequest(m.body) : null }
        } catch (err) {
          reply = { type: 'reply', id: m.id, error: err.message }
        }
        send(reply)
      } else if (m.type === 'reply') {
        const p = pending.get(m.id)
        if (!p) return
        pending.delete(m.id)
        if (m.error) { emit('request-failed', { id: m.id }); p.reject(new Error(m.error)) } else p.resolve(m.body)
      }
    }
  })
  channel.open()

  function send (m) {
    message.send(m)
    emit('message', { direction: 'out', type: m.type, bytes: size(m) })
  }

  return {
    opened,
    send: body => send({ type: 'message', body }),
    request (body) {
      const id = nextId++
      const answer = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
      send({ type: 'request', id, body })
      return answer
    },
    close: () => channel.close()
  }
}

const size = m => Buffer.byteLength(JSON.stringify(m))

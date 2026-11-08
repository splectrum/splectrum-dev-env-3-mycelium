import test from 'brittle'
import http from 'bare-http1'
import { serveTransport } from '../index.js'
import { createModel } from '../../splectral-model/index.js'

// The stream, read as the browser does: messages as they come.
function stream (base) {
  const messages = []
  let wake = null
  let rest = ''
  const req = http.request(`${base}/stream`, res => {
    res.on('data', chunk => {
      rest += Buffer.from(chunk).toString()
      const parts = rest.split('\n\n')
      rest = parts.pop()
      for (const part of parts) if (part.startsWith('data: ')) messages.push(JSON.parse(part.slice(6)))
      if (wake) { wake(); wake = null }
    })
    res.on('error', () => {})
  })
  req.on('error', () => {})
  req.end()
  return {
    messages,
    async next (n) { while (messages.length < n) await new Promise(resolve => { wake = resolve }) },
    close () { req.destroy() }
  }
}

function post (url, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST' }, res => {
      let text = ''
      res.on('data', c => { text += Buffer.from(c).toString() })
      res.on('end', () => resolve(JSON.parse(text)))
    })
    req.on('error', reject)
    req.end(body)
  })
}

test('a snapshot, then changes; an action and its result', async (t) => {
  const model = createModel()
  model.apply({ kind: 'joined', uri: '/s/a', host: 'h', key: 'k' })
  const tr = serveTransport({ model, act: async a => ({ ok: true, result: { did: a.action } }) })
  const sockets = new Set()
  const server = http.createServer((req, res) => { if (!tr.handle(req, res)) { res.writeHead(404); res.end() } })
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const s = stream(base)
  await s.next(1)
  model.apply({ kind: 'gone', uri: '/s/a' })
  await s.next(2)
  t.is(s.messages[0].type, 'snapshot')
  t.is(s.messages[0].snapshot.nodes['/s/a'].status, 'running')
  t.alike([s.messages[1].type, s.messages[1].event.kind, s.messages[1].version], ['event', 'gone', 2])
  t.alike(await post(`${base}/act`, JSON.stringify({ action: 'state' })), { ok: true, result: { did: 'state' } })
  s.close()
  tr.close()
  const closed = new Promise(resolve => server.close(resolve))
  for (const socket of sockets) socket.destroy()
  await closed
})

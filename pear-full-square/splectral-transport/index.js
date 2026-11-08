// splectral-transport — the stream between server and browser: a snapshot,
// then changes; actions and their results. Over HTTP first: Server-Sent
// Events down (`GET /stream`), actions up (`POST /act`): the browser's
// adapter onto the server's client topics (the server's `act`). Later, a worklet's
// IPC, behind the same messages.
//   const t = serveTransport({ model, act })    server side; act(action) → { ok, result | error }
//   t.handle(req, res)  → true if it was the transport's request
// Messages down: { type: 'snapshot', snapshot } then { type: 'event', event, version }.

export function serveTransport ({ model, act }) {
  const clients = new Set()
  model.subscribe((event, version) => {
    const line = `data: ${JSON.stringify({ type: 'event', event, version })}\n\n`
    for (const res of clients) res.write(line)
  })
  return {
    clients: () => clients.size,
    handle (req, res) {
      if (req.method === 'GET' && req.url === '/stream') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
        res.write(`data: ${JSON.stringify({ type: 'snapshot', snapshot: model.snapshot() })}\n\n`)
        clients.add(res)
        // The response's close, not the request's: a request with no body
        // has ended (and, on Bare, closed) before its stream does.
        res.on('close', () => clients.delete(res))
        return true
      }
      if (req.method === 'POST' && req.url === '/act') {
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', async () => {
          let out
          try { out = await act(JSON.parse(body)) } catch (err) { out = { ok: false, error: err.message } }
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(out))
        })
        return true
      }
      return false
    },
    close () { for (const res of clients) res.end(); clients.clear() }
  }
}

// splectral-transport, the browser's side: the stream into a local model,
// actions out. Pages read the model, never the server.
//   const t = connectTransport({ base, model, onSnapshot })
//   await t.act({ action, with })

export function connectTransport ({ base = '', model, onSnapshot = () => {} }) {
  const source = new EventSource(`${base}/stream`)
  source.onmessage = m => {
    const msg = JSON.parse(m.data)
    if (msg.type === 'snapshot') onSnapshot(msg.snapshot)
    else if (msg.type === 'event') model.apply(msg.event)
  }
  return {
    async act (action) {
      const r = await fetch(`${base}/act`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) })
      return r.json()
    },
    close: () => source.close()
  }
}

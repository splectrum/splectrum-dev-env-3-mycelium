// A node's page: its state, its resources, and everything that happened to it.
const about = (e, uri) => e.kind === 'connected' || e.kind === 'disconnected' ? `link ${e.from === uri ? 'out' : 'in'}${e.bytes ? `, ${e.bytes} bytes` : ''}` : e.name || e.path || e.action || e.text || ''

export default function Node ({ state, param, html }) {
  const n = state.nodes[param]
  if (!n) return html`<p class="muted">Not known yet: ${param}</p>`
  const mine = e => e.uri === param || e.from === param || e.node === param || (e.uri || '').startsWith(param + '/') || (e.to || '').startsWith(param + '/')
  const rows = state.activity.filter(mine).slice(-200).reverse()
  const res = Object.values(state.resources).filter(r => r.node === param)
  return html`
    <section data-node-page=${param}>
      <h2>${param}</h2>
      <p>On <b>${n.host}</b> · <span data-status>${n.status}</span> · <span data-presence>${n.presence === 'absent' ? 'absent, not heard from within its lease' : n.presence === 'left' ? 'left' : n.presence || ''}</span> · ${n.controlled ? 'controlled by its host' : 'joined from elsewhere'}</p>
      <p>Resources: ${res.map(r => html`<code style=${{ marginRight: '8px' }}>${r.uri}</code>`)}</p>
      <table><thead><tr><th>#</th><th>kind</th><th>about</th></tr></thead>
      <tbody>${rows.map(e => html`<tr data-event=${e.kind}><td>${e.version}</td><td>${e.kind}</td><td>${about(e, param)}</td></tr>`)}</tbody></table>
    </section>`
}

// splectral-timeline — every event of the world, newest first; filter by
// kind. Generic: it reads the abstract world only.
const { useState } = window.React

const about = e => e.text || e.uri || e.from || e.action || ''

export default function Timeline ({ state, html }) {
  const [kind, setKind] = useState('')
  const kinds = [...new Set(state.activity.map(e => e.kind))].sort()
  const rows = state.activity.filter(e => !kind || e.kind === kind).slice(-300).reverse()
  return html`
    <section data-timeline>
      <h2>Timeline</h2>
      <label>Kind <select data-filter value=${kind} onChange=${e => setKind(e.target.value)}><option value="">all</option>${kinds.map(k => html`<option value=${k}>${k}</option>`)}</select></label>
      <table><thead><tr><th>#</th><th>time</th><th>kind</th><th>about</th></tr></thead>
      <tbody>${rows.map(e => html`<tr data-event=${e.kind}><td>${e.version}</td><td>${e.time ? new Date(e.time).toISOString().slice(11, 23) : ''}</td><td>${e.kind}</td><td>${about(e)}</td></tr>`)}</tbody></table>
    </section>`
}

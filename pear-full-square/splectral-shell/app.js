// splectral-shell — the browser's shell: the menu from what is available,
// routing (#<ext>/<page>[/<param>]), pages hosted as tabs, one beside the
// active page if asked. Pages read the local
// model (splectral-model), fed by the transport; they act through it.
// A page module's default export is a component: ({ state, param, act, html }).

import { createModel } from '/m/splectral-model/index.js'
import { connectTransport } from '/m/splectral-transport/browser.js'

const { createElement: h, useState, useEffect } = window.React
const html = window.htm.bind(h)
const model = createModel({ keep: 1000 })
const transport = connectTransport({ model, onSnapshot: snap => model.restore(snap) })
const act = action => transport.act(action)
const pages = new Map()

function useModel () {
  const [state, setState] = useState(model.snapshot())
  useEffect(() => {
    let pending = false
    const off = model.subscribe(() => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => { pending = false; setState(model.snapshot()) })
    })
    // What arrived before this subscription (the snapshot, often).
    setState(model.snapshot())
    return off
  }, [])
  return state
}

function useRoute () {
  const [route, setRoute] = useState(location.hash.slice(1))
  useEffect(() => { const f = () => setRoute(location.hash.slice(1)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return route
}

const keyOf = e => `${e.ext}/${e.page}${e.param ? '/' + encodeURIComponent(e.param) : ''}`

// Tabs: the pages opened, kept for this viewer (a convenience: none if the
// browser keeps nothing); one active, one optionally beside it.
const saved = (() => { try { return JSON.parse(localStorage.getItem('splectral.tabs') || 'null') } catch { return null } })()
const keep = v => { try { localStorage.setItem('splectral.tabs', JSON.stringify(v)) } catch {} }

// A page in a pane: its module loaded once, then rendered with the model.
function Pane ({ entry, state }) {
  const [Page, setPage] = useState(null)
  useEffect(() => {
    const load = pages.get(entry.module) || import(entry.module).then(m => m.default)
    pages.set(entry.module, load)
    load.then(p => setPage(() => p))
  }, [entry.module])
  return html`<section class="pane" data-pane=${keyOf(entry)}>${Page ? html`<${Page} state=${state} param=${entry.param} act=${act} html=${html} />` : null}</section>`
}

function Shell () {
  const state = useModel()
  const route = useRoute()
  const [menu, setMenu] = useState([])
  const [tabs, setTabs] = useState(saved?.open || [])
  const [beside, setBeside] = useState(saved?.beside || null)
  const nodeCount = Object.keys(state.nodes).length
  useEffect(() => { fetch('/menu').then(r => r.json()).then(setMenu) }, [nodeCount])
  const byKey = new Map(menu.map(e => [keyOf(e), e]))
  const current = byKey.get(route) || menu[0]
  const active = current ? keyOf(current) : null
  // The active page is always a tab.
  useEffect(() => { if (active && !tabs.includes(active)) setTabs(t => [...t, active]) }, [active])
  useEffect(() => keep({ open: tabs, beside }), [tabs, beside])
  const open = tabs.filter(k => byKey.has(k))
  const close = k => {
    const rest = tabs.filter(x => x !== k)
    setTabs(rest)
    if (beside === k) setBeside(null)
    if (k === active) location.hash = rest.length ? rest[rest.length - 1] : ''
  }
  const side = beside && beside !== active && byKey.get(beside)
  return html`
    <header><h1>Splectral</h1><span class="meta" data-version=${state.version}>${nodeCount} nodes · ${Object.keys(state.resources).length} resources · event ${state.version}</span></header>
    <div class="layout">
      <nav data-menu>${menu.map(e => html`<a href=${'#' + keyOf(e)} class=${keyOf(e) === active ? 'on' : ''} data-page=${keyOf(e)}>${e.title}</a>`)}</nav>
      <main data-current=${active || ''} data-beside=${side ? beside : ''}>
        ${open.length > 1 || side ? html`<div class="tabs" role="tablist">${open.map(k => html`
          <span class=${'tab' + (k === active ? ' on' : '') + (k === beside ? ' beside' : '')} data-tab=${k}>
            <a href=${'#' + k} role="tab" aria-selected=${k === active}>${byKey.get(k).title}</a>
            <button title="Show beside the active page" data-beside-toggle=${k} onClick=${() => setBeside(beside === k ? null : k)}>⇆</button>
            <button title="Close" data-close=${k} onClick=${() => close(k)}>×</button>
          </span>`)}</div>` : null}
        ${current ? html`<div class=${side ? 'panes two' : 'panes'}>
          <${Pane} key=${active} entry=${current} state=${state} />
          ${side ? html`<${Pane} key=${beside} entry=${side} state=${state} />` : null}
        </div>` : html`<p class="muted">Waiting for a source…</p>`}
      </main>
    </div>`
}

window.ReactDOM.createRoot(document.getElementById('app')).render(html`<${Shell} />`)

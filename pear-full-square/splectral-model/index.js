// splectral-model — events of the abstract world folded into a model;
// snapshots and changes. The same code in the server and the browser.
//   const m = createModel({ keep })
//   m.apply(event)        an event of the abstract world (splectral-contract)
//   m.snapshot()          { version, hosts, nodes, resources, links, activity }
//   m.subscribe(fn)       fn(event, version) after each apply; returns unsubscribe
//   m.restore(snapshot)   start from a snapshot (the browser, from the server's)

export function createModel ({ keep = 500 } = {}) {
  let version = 0
  const hosts = {} // name -> { name }
  const nodes = {} // uri -> { uri, host, status, controlled, key, presence, absentSince }
  const byKey = {} // key -> uri
  const resources = {} // uri -> { uri, node, type, changes }
  const links = {} // 'from|to' -> { from, to, open, bytes, opened }
  const activity = []
  const listeners = new Set()
  const linkOf = (from, toKey) => {
    const to = byKey[toKey] || toKey
    const id = [from, to].sort().join('|')
    return (links[id] ??= { id, from, to, open: false, bytes: 0, opened: 0 })
  }
  const host = name => name && (hosts[name] ??= { name })

  function apply (e) {
    switch (e.kind) {
      case 'nodeStarting':
      case 'joined': {
        host(e.host)
        const n = (nodes[e.uri] ??= { uri: e.uri })
        Object.assign(n, { host: e.host ?? n.host, controlled: e.controlled ?? n.controlled, status: e.kind === 'joined' ? 'running' : 'starting' })
        if (e.kind === 'joined' && n.presence !== 'absent') n.presence = 'present'
        if (e.key) { n.key = e.key; byKey[e.key] = e.uri }
        break
      }
      case 'gone': if (nodes[e.uri]) { nodes[e.uri].status = 'gone'; if (e.controlled !== undefined) nodes[e.uri].controlled = e.controlled } for (const l of Object.values(links)) if (l.from === e.uri || l.to === e.uri) l.open = false; break
      // Presence, as the world's naming sees it: apart from status
      // (what its host sees of the process).
      case 'absent': if (nodes[e.uri]) Object.assign(nodes[e.uri], { presence: 'absent', absentSince: e.since }); break
      case 'present': if (nodes[e.uri]) { nodes[e.uri].presence = 'present'; delete nodes[e.uri].absentSince } break
      case 'left': if (nodes[e.uri]) { nodes[e.uri].presence = 'left'; delete nodes[e.uri].absentSince } break
      case 'resource': resources[e.uri] = { ...(resources[e.uri] || { changes: 0 }), uri: e.uri, node: e.node, type: e.type }; break
      case 'connected': { const l = linkOf(e.from, e.toKey); l.open = true; l.opened++; break }
      case 'disconnected': { const l = linkOf(e.from, e.toKey); l.open = false; l.bytes += e.bytes || 0; break }
      case 'changed': if (resources[e.uri]) resources[e.uri].changes++; break
      default: break
    }
    version++
    activity.push({ version, ...e })
    if (activity.length > keep) activity.shift()
    for (const fn of listeners) fn(e, version)
    return version
  }

  // Keys stay inside: a link's end that is a known node is shown by URI.
  const snapshot = () => JSON.parse(JSON.stringify({
    version,
    hosts,
    nodes,
    resources,
    links: Object.fromEntries(Object.entries(links).map(([k, l]) => [k, { ...l, to: byKey[l.to] || l.to }])),
    activity
  }))

  function restore (snap) {
    version = snap.version
    for (const [k, v] of Object.entries(snap.hosts)) hosts[k] = v
    for (const [k, v] of Object.entries(snap.nodes)) { nodes[k] = v; if (v.key) byKey[v.key] = k }
    for (const [k, v] of Object.entries(snap.resources)) resources[k] = v
    for (const [k, v] of Object.entries(snap.links)) links[k] = v
    activity.splice(0, activity.length, ...snap.activity)
    for (const fn of listeners) fn({ kind: 'restored' }, version)
  }

  return { apply, snapshot, restore, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) }, get version () { return version } }
}

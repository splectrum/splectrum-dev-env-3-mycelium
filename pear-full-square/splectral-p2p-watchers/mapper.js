// The p2p records, mapped into the abstract world (splectral-contract).
// All knowledge of p2p stays here: applications see hosts, nodes,
// resources, links and requests.
//
// From the source `haicc-swarm`: each node's container log (`haicc-node/log`:
// the node's own JSON lines) and its container followed and ended
// (`haicc-node/container`); every node there controlled by this host's
// HAICC. From the source `p2p-host`: a node manager's topics, on a host of
// its own (`p2p-node-manager/manager`: which node a folder is, from its
// `starting`; `p2p-node/log`: the node's lines, waiting for that); such a
// node is not controlled by the swarm's host.

export default function createMapper () {
  const container = (v, ctx) => {
    if (v.kind === 'following') return [{ kind: 'nodeStarting', uri: ctx.uri, host: ctx.host, controlled: true, time: v.time }]
    if (v.kind === 'exited') return [{ kind: 'gone', uri: ctx.uri, exitCode: v.exitCode, time: v.time }]
    return []
  }

  const log = (v, ctx, r) => {
    const uri = ctx.uri
    const t = v.time
    switch (v.kind) {
      // A managed node's joined comes from its manager's node-ready.
      case 'node-started': return ctx.managed ? [] : [{ kind: 'joined', uri, host: ctx.host, key: v.owner, controlled: true, time: t }]
      case 'genesis': return ['packages', 'boot', 'deployment'].filter(n => v[n]).map(n => ({ kind: 'resource', uri: `${uri}/${n}`, node: uri, type: n, time: t }))
      case 'live': return [{ kind: 'resource', uri: v.uri, node: uri, type: 'node', time: t }]
      case 'connection-opened': return [{ kind: 'connected', from: uri, toKey: v.peer, time: t }]
      case 'connection-closed': return [{ kind: 'disconnected', from: uri, toKey: v.peer, bytes: (v.bytesReceived || 0) + (v.bytesSent || 0), time: t }]
      // The name service's view of presence (p2p-rns, in the master's log).
      case 'node-absent': return v.module === 'p2p-rns' ? [{ kind: 'absent', uri: v.uri, since: v.lastSeen + v.leaseMs, time: t }] : []
      case 'node-present': return v.module === 'p2p-rns' ? [{ kind: 'present', uri: v.uri, time: t }] : []
      case 'node-left': return v.module === 'p2p-rns' ? [{ kind: 'left', uri: v.uri, time: t }] : []
      case 'request-taken': return [{ kind: 'requestSent', fromKey: v.sender, to: `${uri}/${v.repository || 'node'}`, uri: `${uri}/${v.repository || 'node'}`, name: v.name, time: t }]
      case 'requests-executed': return (v.executed || []).map(name => ({ kind: 'requestAnswered', uri: `${uri}/node`, name, time: t }))
      // An observer's result (a managed node's), with its action's correlation.
      case 'action-result': {
        const corr = (r.headers || []).find(h => h.key === 'correlation')?.value
        const out = [{ kind: 'actionResult', node: uri, action: v.action, ok: v.ok, correlation: corr, time: t }]
        if (v.ok && v.action === 'write') out.push({ kind: 'changed', uri: v.result.uri, path: v.result.path, time: t })
        return out
      }
      default: return []
    }
  }

  // A node manager's folders: which node each is; a node's lines read
  // before its manager's `starting` wait for it.
  const folders = {}
  const waiting = {}
  const manager = (v, ctx, at) => {
    const uri = folders[at]
    switch (v.kind) {
      case 'starting': {
        const u = `/${v.swarm}/${v.name}`
        folders[at] = u
        const out = [{ kind: 'nodeStarting', uri: u, host: ctx.host, controlled: false, time: v.time }]
        for (const r of waiting[at] || []) out.push(...log(r.value, { host: ctx.host, uri: u, managed: true }, r))
        delete waiting[at]
        return out
      }
      case 'node-ready': return [{ kind: 'joined', uri: v.uri, host: ctx.host, key: v.key, controlled: false, time: v.time }]
      case 'container-exited': return uri ? [{ kind: 'gone', uri, exitCode: v.exitCode, time: v.time }] : []
      default: return []
    }
  }

  return (record, topic) => {
    const ctx = topic.context || {}
    const v = record.value || {}
    if (topic.holds === 'haicc-node/container') return container(v, ctx)
    if (topic.holds === 'haicc-node/log') return log(v, ctx, record)
    const at = `${ctx.host}/${ctx.folder}`
    if (topic.holds === 'p2p-node-manager/manager') return manager(v, ctx, at)
    if (topic.holds === 'p2p-node/log') {
      if (!folders[at]) { (waiting[at] ??= []).push(record); return [] }
      return log(v, { host: ctx.host, uri: folders[at], managed: true }, record)
    }
    return []
  }
}

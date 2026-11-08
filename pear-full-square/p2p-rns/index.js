// p2p-rns — the resource name service: a swarm's nodes and resources by
// URI. Rooted in p2p (it knows keys, nodes and the swarm); its users get
// URIs and identities.
//   const rns = createRns({ swarm, observer, leaseMs })   in code, in memory,
//                                                  for the life of the node running it
//   rns.registerNode({ owner, name, local })        a node joins under a name
//   rns.register({ owner, name, id, key, type })    a resource under its owner's node
//   rns.renew(owner)       the heartbeat: the owner's lease renewed
//   rns.leave(owner)       gracefully: the node and its resources taken out
//   rns.resolve(uri)       '/<swarm>/<node>[/<name>]' -> its record, or null
//   rns.list(pattern)      '*' for any one segment -> the records it matches
//   rns.reverse(key)       a key -> its URI, or null
//   rns.sweep()            flags the nodes whose lease ran out (also on a timer)
//   rns.handler(owner)     onrequest for a p2p-channel: owner is the peer's key
//   rns.close()            stops the sweep's timer
//   rnsClient(channel)     the same operations, asked on a channel
//
// Owners only: `owner` is the registering node's public key (hex), from the
// connection, never from the message. A node has one name, unique in the
// swarm; it names its own resources, unique under it, and may change what
// a name points to (a rebuilt repository's new key). The registry keeps
// nothing: if the node running it restarts, owners register again.
//
// Liveness. A node registered from a peer holds a lease of `leaseMs`; any
// operation from its owner renews it, `renew` is the heartbeat, and the
// registration answers with the lease so the node knows how often to
// renew. A node whose lease runs out is flagged absent (`present: false`,
// `absentSince`), not taken out: its records stay, flagged, and its name
// stays its owner's; renewing makes it present again. `leave` takes it out
// and frees its name. A registration made `local` (the node running the
// service) holds no lease. Every record says its node's presence.
//
// Instrumentation (the series' contract): node-registered, registered,
// node-absent, node-present, node-left, refused (with why), and counts as
// metrics.

import { validate, validateName } from '../mycelium-uri/index.js'

const MODULE = 'p2p-rns'

export function createRns ({ swarm, observer = null, leaseMs = 15000, sweepEvery = Math.ceil(leaseMs / 3), now = () => Date.now() }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: now(), ...facts })
  const records = new Map() // uri -> record
  const nodes = new Map() // owner -> node name
  const leases = new Map() // owner -> { until, lastSeen }
  const counts = { registerNode: 0, register: 0, renew: 0, leave: 0, absent: 0, present: 0, refused: 0, resolve: 0, list: 0, reverse: 0 }

  const refuse = (owner, op, why) => {
    counts.refused++
    emit('refused', { owner, op, why })
    throw new Error(why)
  }
  const segments = uri => {
    const parts = String(uri).split('/')
    if (parts[0] !== '' || parts.length < 2) throw new Error(`not a URI: ${uri}`)
    return parts.slice(1)
  }
  const nodeRecord = owner => records.get(`/${swarm}/${nodes.get(owner)}`)
  // What callers see: a record with its node's presence.
  const view = r => {
    if (!r) return null
    const n = r.kind === 'node' ? r : nodeRecord(r.owner)
    return { ...r, present: n.present, ...(n.present ? {} : { absentSince: n.absentSince }) }
  }

  function renewLease (owner) {
    const lease = leases.get(owner)
    if (!lease) return
    lease.lastSeen = now()
    lease.until = lease.lastSeen + leaseMs
    const n = nodeRecord(owner)
    if (!n.present) {
      n.present = true
      delete n.absentSince
      counts.present++
      emit('node-present', { uri: n.uri, owner })
    }
  }

  const rns = {
    swarm,
    leaseMs,
    registerNode ({ owner, name, local = false }) {
      const uri = `/${swarm}/${name}`
      const held = records.get(uri)
      if (held && held.owner !== owner) refuse(owner, 'registerNode', `node name taken: ${name}`)
      if (nodes.has(owner) && nodes.get(owner) !== name) refuse(owner, 'registerNode', `already a node: ${nodes.get(owner)}`)
      if (!held) {
        records.set(uri, { uri, kind: 'node', name, owner, present: true })
        nodes.set(owner, name)
        if (!local) leases.set(owner, {})
        emit('node-registered', { uri, owner, leaseMs: local ? null : leaseMs })
      }
      renewLease(owner)
      counts.registerNode++
      return { ...view(records.get(uri)), leaseMs: leases.has(owner) ? leaseMs : null }
    },
    register ({ owner, name, id, key, type = null }) {
      const node = nodes.get(owner)
      if (!node) refuse(owner, 'register', 'not a node of this swarm')
      const uri = `/${swarm}/${node}/${name}`
      const before = records.get(uri)
      const record = { uri, kind: 'resource', node, name, type, id, key, owner }
      records.set(uri, record)
      counts.register++
      emit('registered', { uri, owner, id, key, type, replaced: before ? before.key : null })
      return view(record)
    },
    renew (owner) {
      if (!nodes.has(owner)) refuse(owner, 'renew', 'not a node of this swarm')
      renewLease(owner)
      counts.renew++
      return { uri: `/${swarm}/${nodes.get(owner)}`, leaseMs: leases.has(owner) ? leaseMs : null }
    },
    leave (owner) {
      if (!nodes.has(owner)) return { left: null }
      const uri = `/${swarm}/${nodes.get(owner)}`
      let resources = 0
      for (const [u, r] of records) if (r.owner === owner) { records.delete(u); if (r.kind === 'resource') resources++ }
      nodes.delete(owner)
      leases.delete(owner)
      counts.leave++
      emit('node-left', { uri, owner, resources })
      return { left: uri }
    },
    sweep () {
      const t = now()
      const flagged = []
      for (const [owner, lease] of leases) {
        const n = nodeRecord(owner)
        if (!n.present || lease.until > t) continue
        n.present = false
        n.absentSince = lease.until
        counts.absent++
        flagged.push(n.uri)
        emit('node-absent', { uri: n.uri, owner, lastSeen: lease.lastSeen, leaseMs })
      }
      return flagged
    },
    resolve (uri) {
      counts.resolve++
      segments(uri)
      return view(records.get(uri))
    },
    list (pattern) {
      counts.list++
      const want = segments(pattern)
      return [...records.values()]
        .filter(r => {
          const have = segments(r.uri)
          return have.length === want.length && want.every((w, i) => w === '*' || w === have[i])
        })
        .sort((a, b) => a.uri.localeCompare(b.uri))
        .map(view)
    },
    reverse (key) {
      counts.reverse++
      for (const r of records.values()) if (r.key === key || (r.kind === 'node' && r.owner === key)) return r.uri
      return null
    },
    // A p2p-channel's onrequest for one peer: the peer's key is the owner.
    // The boundary: what a peer sends is validated here (mycelium-uri),
    // once; the registry inside trusts it. Anything a registered owner
    // asks renews its lease.
    handler (owner) {
      const name = (n, what) => { try { return validateName(n, what) } catch (err) { refuse(owner, 'validate', err.message) } }
      const uri = (u, star) => { try { return validate(u, { star }) } catch (err) { refuse(owner, 'validate', err.message) } }
      return body => {
        if (body.op !== 'renew' && body.op !== 'leave' && nodes.has(owner)) renewLease(owner)
        switch (body.op) {
          case 'registerNode': return rns.registerNode({ owner, name: name(body.name, 'node name') })
          case 'register': return rns.register({ owner, name: name(body.name, 'resource name'), id: body.id, key: body.key, type: body.type })
          case 'renew': return rns.renew(owner)
          case 'leave': return rns.leave(owner)
          case 'resolve': return rns.resolve(uri(body.uri, false))
          case 'list': return rns.list(uri(body.pattern, true))
          case 'reverse': return rns.reverse(body.key)
          default: throw new Error(`unknown op: ${body.op}`)
        }
      }
    },
    metrics: () => ({ records: records.size, nodes: nodes.size, absentNow: [...nodes.keys()].filter(o => !nodeRecord(o).present).length, ...counts }),
    close () { clearInterval(timer) }
  }
  const timer = sweepEvery ? setInterval(() => rns.sweep(), sweepEvery) : null
  return rns
}

// The same operations, asked of the swarm's p2p-rns on a channel (the
// channel named 'p2p-rns' on a connection to the node running it).
export function rnsClient (channel) {
  const ask = body => channel.request(body)
  return {
    registerNode: name => ask({ op: 'registerNode', name }),
    register: ({ name, id, key, type }) => ask({ op: 'register', name, id, key, type }),
    renew: () => ask({ op: 'renew' }),
    leave: () => ask({ op: 'leave' }),
    resolve: uri => ask({ op: 'resolve', uri }),
    list: pattern => ask({ op: 'list', pattern }),
    reverse: key => ask({ op: 'reverse', key })
  }
}

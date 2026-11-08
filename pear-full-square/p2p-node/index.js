// p2p-node — the node application: a node of a swarm, composed from the
// p2p series (store, DHT, connections, replication, channels), its
// repositories (p2p-mrepo, with mycelium) and the resource name service
// (p2p-rns). The application composes them; none knows another.
//   const node = await startNode({ role, swarm, name, storage, primaryKey, host, ... })
//   node.uri, node.key, node.repos, node.metrics(), await node.stop()
//
// Role master: the swarm's first node, from zero (genesis). It starts the
// swarm's DHT (two persistent nodes at host:dhtPort), runs p2p-rns in
// memory, and makes the swarm's first repositories from what it was given:
// `packages` (the node's code, the folder `code`, deployed, imported once
// at the boundary) and `boot` (the template every node's repository is
// cloned from). Options: dhtPort, code.
//
// Role join: a node joining that swarm. It takes part in its DHT (from
// `bootstrap`), connects to the master (`master`, its key) for p2p-rns,
// and joins under its name. Options: bootstrap, master, packages (the
// packages it runs: { key, commit }).
//
// Both go live the same way: the swarm's boot repository cloned into the
// node's own `node` repository, under its own key (its origin recorded),
// its record (node.json) and its capability (capability/default: a link to
// the packages it runs) committed; registered in p2p-rns, announced, and
// served, with requests to it taken on a channel (requests.js). Everything
// is reproducible: fixed author and time, ids derived from the node's
// identity and the names, so a rebuilt node has the same keys, commits and
// ids.
//
// Liveness (p2p-rns's lease): a joining node renews its registration
// every third of the lease p2p-rns tells it, on the master's current
// connection (a new connection, after a pause or a network gap, is taken
// again and renewed at once; a registry that forgot the node, its master
// restarted, is registered again). On a graceful stop it leaves, bounded in
// time. The master runs p2p-rns (option `leaseMs`) and holds no lease.
//
// The store is meant for RAM (a tmpfs): it holds the node's secrets
// (step 0). `primaryKey` comes from the node manager, never from a file the
// node keeps. Instrumentation: every module's events go to the observer
// (the node's log); the node adds node-started, genesis, live, metrics
// (every interval), request-taken, requests-executed, renew-failed,
// registered-again, left and node-stopped.

import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startBootstrap, startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { createRns, rnsClient } from 'p2p-rns'
import { mrepos, idFrom } from 'p2p-mrepo'
import { writer, openRepo } from '../mycelium-git/index.js'
import { deploy } from '../mycelium-layer/index.js'
import { requests } from './requests.js'
export { checkDeployment } from './deployment.js'

export { askRequest, requestBundle } from './requests.js'

const MODULE = 'p2p-node'
const hex = b => b.toString('hex')
const author = { name: 'p2p-node', email: 'p2p-node@localhost' }
const time = '2026-01-01T00:00:00Z' // fixed: the same input, the same commits

// A swarm's topic: where its nodes find the master.
export const swarmTopic = swarm => crypto.hash(Buffer.from(`p2p-swarm:${swarm}`))

export async function startNode (opts) {
  const { role } = opts
  if (role !== 'master' && role !== 'join') throw new Error(`unknown role: ${role}`)
  // What a start opens is closed again if the start fails (a name refused,
  // the master unreachable): nothing is left running.
  const opened = []
  try {
    return await start(opts, opened)
  } catch (err) {
    for (const close of opened.reverse()) await close().catch(() => {})
    opts.observer?.({ module: MODULE, kind: 'start-failed', time: Date.now(), error: err.message })
    throw err
  }
}

async function start (opts, opened) {
  const { role, swarm, name, storage, primaryKey, host, observer = null, metricsEvery = 30000 } = opts
  const t0 = Date.now()
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })

  const store = await openStore({ storage, primaryKey, observer })
  opened.push(() => store.close())
  const keyPair = await store.corestore.createKeyPair('p2p-node/identity')
  const owner = hex(keyPair.publicKey)
  const idOf = repo => idFrom(crypto.hash(Buffer.from(`${owner}/${repo}`)))
  const repos = mrepos({ store, observer })
  const rep = replicator({ store, observer })

  let boot = null
  let dht
  if (role === 'master') {
    boot = await startBootstrap({ host, port: opts.dhtPort ?? 49737, observer })
    opened.push(() => boot.close())
    dht = await startDht({ host, bootstrap: boot.bootstrap, observer })
  } else {
    dht = await startDht({ host, bootstrap: opts.bootstrap, persistent: true, observer })
  }
  opened.push(() => dht.close())
  const net = connect({ dht: dht.dht, keyPair, observer })
  opened.push(() => net.close())

  // The name service: the master runs it; a joining node asks the master.
  let rns, rnsLocal = null
  let leave = null
  const services = []
  if (role === 'master') {
    rnsLocal = createRns({ swarm, observer, ...(opts.leaseMs ? { leaseMs: opts.leaseMs } : {}) })
    opened.push(async () => rnsLocal.close())
    rnsLocal.registerNode({ owner, name, local: true })
    const local = rnsLocal
    rns = {
      register: r => local.register({ owner, ...r }),
      resolve: uri => local.resolve(uri)
    }
  }
  // A joining node's channel to the name service: the master's current
  // connection's (taken again on each new one).
  let resolveMaster
  let toMaster = null
  const masterChannel = role === 'join' ? new Promise(resolve => { resolveMaster = resolve }) : null
  let masterStream = null
  const onMaster = (ch, stream) => {
    masterStream = stream
    const first = !toMaster
    toMaster = rnsClient(ch)
    if (first) resolveMaster(ch)
    else ch.opened.then(() => heartbeat?.(), () => {})
  }
  let heartbeat = null

  net.onConnection((stream, peer) => {
    rep.replicate(stream, { peer: peer.peer })
    if (rnsLocal) openChannel(stream, { name: 'p2p-rns', peer: peer.peer, observer, onrequest: rnsLocal.handler(peer.peer) })
    else if (peer.peer === opts.master) onMaster(openChannel(stream, { name: 'p2p-rns', peer: peer.peer, observer }), stream)
    for (const s of services) serveRequests(stream, s, peer.peer)
  })
  const serving = new WeakSet()
  function serveRequests (stream, service, peer) {
    if (serving.has(stream)) return
    serving.add(stream)
    openChannel(stream, { name: 'p2p-request', peer, observer, onrequest: service.handler(peer) })
  }

  // Genesis (master): the packages and the boot repository.
  let packages = opts.packages || null
  if (role === 'master') {
    const pk = await repos.create('packages', { id: idOf('packages') })
    const r = await deploy({ backend: pk.backend, layer: 'capability/default', folder: opts.code, message: 'The node packages, as deployed\n', author, time })
    const bt = await repos.create('boot', { id: idOf('boot') })
    const w = writer(bt.backend)
    await w.createLayer('main', 'Create main', { author, time })
    let c = await w.change('main')
    await c.put('/readme.md', `# A node's repository\n\nCloned from the swarm ${swarm}'s boot repository; the node's own record\n(node.json) and its capability (capability/default) are its own.\n`)
    await c.commit('The boot repository', { author, time })
    await w.createLayer('pending/default', 'Create pending/default', { author, time })
    c = await w.change('pending/default')
    await c.put('/readme.md', 'Requests to this node, one folder each: pending/<name>/request.md.\n')
    await c.commit('Where requests come', { author, time })
    await w.createExecution('main')
    // The swarm's deployment (step 10): empty at genesis; the swarm manager
    // hands its part over by request, and the swarm keeps it from then on.
    const dp = await repos.create('deployment', { id: idOf('deployment') })
    const wd = writer(dp.backend)
    await wd.createLayer('main', 'Create main', { author, time })
    const cd = await wd.change('main')
    await cd.put('/deployment.json', JSON.stringify({ swarm, nodes: [] }, null, 2) + '\n')
    await cd.commit(`The deployment of swarm ${swarm}: nothing yet`, { author, time })
    packages = { uri: `/${swarm}/${name}/packages`, key: pk.key, commit: r.commit }
    for (const [repo, type] of [[pk, 'packages'], [bt, 'boot'], [dp, 'deployment']]) {
      rns.register({ name: repo.name, id: repo.id, key: repo.key, type })
      rep.track(repo.drive)
      await net.join(repo.drive.discoveryKey, { server: true, client: false })
    }
    await net.join(swarmTopic(swarm), { server: true, client: false })
    emit('genesis', { swarm, node: name, owner, packages: { key: pk.key, id: pk.id, commit: r.commit, files: r.files }, boot: { key: bt.key, id: bt.id }, deployment: { key: dp.key, id: dp.id }, ms: Date.now() - t0 })
  } else {
    // Joining: to the master, then the name service on that connection.
    net.connectTo(Buffer.from(opts.master, 'hex'))
    const ch = await masterChannel
    await ch.opened
    const registered = await toMaster.registerNode(name)
    // The packages it runs, when not told: the master's, as p2p-rns names
    // them (a node on the master's host runs them from its mount).
    if (!packages) {
      const p = await toMaster.resolve(`/${swarm}/master/packages`)
      packages = p ? { uri: p.uri, key: p.key } : null
    }
    const resources = []
    rns = {
      register: r => { resources.push(r); return toMaster.register(r) },
      resolve: uri => toMaster.resolve(uri)
    }
    // The heartbeat: every third of the lease, each renewal bounded by
    // that third. No answer: the connection is stale (the master closed it
    // while this node was frozen, or the network went), so it is dropped
    // and made again at once, rather than waited on.
    const every = Math.ceil(registered.leaseMs / 3)
    const bounded = (p, ms) => Promise.race([p, new Promise((resolve, reject) => setTimeout(() => reject(new Error('no answer')), ms))])
    let beating = false
    heartbeat = async () => {
      if (beating) return
      beating = true
      try {
        await bounded(toMaster.renew(), every)
      } catch (err) {
        if (/not a node/.test(err.message)) {
          // The registry forgot this node (its master restarted): again.
          await toMaster.registerNode(name)
          for (const r of resources) await toMaster.register(r)
          emit('registered-again', { uri: `/${swarm}/${name}`, resources: resources.length })
        } else {
          emit('renew-failed', { error: err.message })
          if (err.message === 'no answer') masterStream?.destroy()
        }
      } finally { beating = false }
    }
    const beat = setInterval(() => heartbeat().catch(() => {}), every)
    opened.push(async () => clearInterval(beat))
    leave = async () => {
      clearInterval(beat)
      try {
        const r = await bounded(toMaster.leave(), 2000)
        emit('left', { uri: r.left })
      } catch (err) { emit('left', { uri: null, error: err.message }) }
    }
  }

  // Live: the boot repository cloned into the node's own `node` repository.
  const bootRecord = await rns.resolve(`/${swarm}/master/boot`)
  const bootRepo = role === 'master' ? await repos.open('boot') : await repos.replica(bootRecord.key)
  if (role === 'join') { rep.track(bootRepo.drive); await bootRepo.drive.update({ wait: true }); bootRepo.id = bootRecord.id }
  const node = await repos.clone(bootRepo, 'node', { id: idOf('node') })
  const w = writer(node.backend)
  let c = await w.change('main')
  await c.put('/node.json', JSON.stringify({ swarm, name, role, key: owner }, null, 2) + '\n')
  await c.commit(`Node ${name} of swarm ${swarm}`, { author, time })
  await w.createLayer('capability/default', 'Create capability/default', { author, time })
  c = await w.change('capability/default')
  await c.put('/packages.json', JSON.stringify(packages, null, 2) + '\n')
  await c.commit('The packages this node runs', { author, time })
  await rns.register({ name: 'node', id: node.id, key: node.key, type: 'node' })
  rep.track(node.drive)
  await net.join(node.drive.discoveryKey, { server: true, client: false })
  emit('live', { uri: `/${swarm}/${name}/node`, key: node.key, id: node.id, origin: { id: bootRecord.id, key: bootRecord.key }, packages, ms: Date.now() - t0 })

  const metrics = () => ({
    store: store.resources(),
    replicate: rep.metrics(),
    connect: net.metrics(),
    dht: dht.metrics(),
    ...(boot ? { bootstrap: boot.metrics() } : {}),
    ...(rnsLocal ? { rns: rnsLocal.metrics() } : {})
  })
  // The manager's state, shadowed (step 10): read-only, as its manager
  // last told it; the manager is its authority.
  let managerShadow = null
  const status = () => ({ uri: `/${swarm}/${name}`, role, key: owner, packages, connections: net.connections().length, resources: store.resources().length, uptimeMs: Date.now() - t0, ...(managerShadow ? { manager: managerShadow } : {}) })
  // The master keeps the swarm's deployment: `Deployment: set` requests to it.
  const deployment = role === 'master' ? {
    swarm,
    async set (value, sender) {
      const dp = await repos.open('deployment')
      const c = await writer(dp.backend).change('main')
      await c.put('/deployment.json', JSON.stringify(value, null, 2) + '\n')
      const commit = await c.commit(`The deployment of swarm ${swarm}, set\n\nBy ${sender}.\n`, { author })
      emit('deployment-set', { commit, nodes: value.nodes, sender })
      return commit
    }
  } : null
  services.push(requests({ repo: node, status, deployment, observer }))
  // Connections opened before the service existed get its channel now.
  for (const s of net.swarm.connections) serveRequests(s, services[0], hex(s.remotePublicKey))

  const timer = setInterval(() => emit('metrics', metrics()), metricsEvery)
  emit('node-started', { role, swarm, node: name, uri: `/${swarm}/${name}`, owner, dht: role === 'master' ? `${host}:${opts.dhtPort ?? 49737}` : null, ms: Date.now() - t0 })

  let stopping = null
  return {
    uri: `/${swarm}/${name}`,
    key: owner,
    rns: rnsLocal,
    repos: { node, ...(role === 'master' ? { packages: await repos.open('packages'), boot: await repos.open('boot'), deployment: await repos.open('deployment') } : {}) },
    packages,
    packagesCommit: packages?.commit,
    metrics,
    status,
    shadow (state) {
      managerShadow = { status: state.status, container: state.container, image: state.image, ip: state.ip, startedAt: state.startedAt, seen: Date.now() }
      emit('manager-shadowed', { status: state.status })
    },
    stop () {
      stopping ??= (async () => {
        clearInterval(timer)
        emit('metrics', metrics())
        if (leave) await leave()
        if (rnsLocal) rnsLocal.close()
        await net.close()
        await dht.close()
        if (boot) await boot.close()
        await store.close()
        emit('node-stopped', { uri: `/${swarm}/${name}`, ms: Date.now() - t0 })
      })()
      return stopping
    },
    read: (repo, uri) => openRepo(repo.backend).read(uri)
  }
}

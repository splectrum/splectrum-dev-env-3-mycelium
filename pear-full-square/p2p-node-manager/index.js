// p2p-node-manager — one node's manager, on the host machine, for the
// node's whole life: it starts the node's container, hands it its secret,
// follows it and records it, and stops it.
//   const m = manageNode({ folder, vault, image, network, ip, swarm, name, role, ...join })
//   await m.ready        the node said node-started
//   await m.stop()       a graceful stop (SIGTERM to the node)
//   await m.done         the container has exited; its end recorded
//
// The container is hardened: read-only root, every capability dropped, no
// new privileges, an unprivileged user, its memory capped with no swap, no
// core dumps, its store on a tmpfs (in RAM: the store holds the node's
// secrets). Its secret, the node's primary key from the vault, reaches its
// memory only: no file, no mount, no environment variable. Every node
// gets it through the auxiliary swarm (the master too, since step 7). The manager runs a peer of its
//   own on an internal network it shares with its node only (`aux`: the
//   network, its gateway, a DHT port, the container's address there). The
//   container's boot program writes an ephemeral public key to its log;
//   the manager authorises exactly that key, and answers its request for
//   the secret on a channel, once. That link stays: the management
//   channel. The node then runs from the swarm's code (`join`: the master's
//   key and DHT address, the packages' URI, key and commit).
//
// On a host of its own (step 6): `joinFromInvitation` makes the node's
// management plane here (its auxiliary network, created for the node's life
// and removed after) and joins the node from an invitation (public facts:
// the swarm, its data plane, bootstrap, master and packages, the image),
// with this host's vault. No swarm manager is involved: the swarm sees the
// node, this manager controls it.
//
// Topics, in the node's folder (one per node, side by side; nothing
// secret), of Kafka records (mycelium-topic, notes/topics.md):
//   topics/manager   what the manager did and saw: described, started,
//                    ready, resources sampled, exited, stopped
//   topics/node      the node's log as it wrote it, a record per line:
//                    every module's audit and metrics
// The node's state is a view: the fold of topics/manager (nodeState),
// state.json its cache. node.stderr stays a text file.

import { spawn, spawnSync } from 'bare-subprocess'
import { mkdirSync, writeFileSync, renameSync, openSync, writeSync, closeSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { openTopic, folderStorage, committedOffsets } from '../mycelium-topic/index.js'
import crypto from 'hypercore-crypto'
import { startBootstrap } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { openChannel } from 'p2p-channel'

const docker = (...args) => {
  const r = spawnSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`docker ${args[0]}: ${String(r.stderr || '').trim()}`)
  return String(r.stdout || '').trim()
}
const tryDocker = (...args) => { try { return docker(...args) } catch { return null } }

const topicOf = (folder, name) => openTopic({ storage: folderStorage(join(folder, 'topics', name)) })

// The node's state from its manager's records, in offset order. A run
// starts at `starting`: what came before belongs to earlier runs.
export function reduceNodeState (state, v) {
  switch (v.kind) {
    case 'starting': return { swarm: v.swarm, name: v.name, role: v.role, container: v.container, image: v.image, ip: v.ip, status: 'starting', startedAt: new Date(v.time).toISOString() }
    case 'materialised': return { ...state, materialised: { commit: v.commit, files: v.files, downloaded: v.downloaded, ms: v.ms } }
    case 'node-genesis': return { ...state, genesis: { packages: v.packages, boot: v.boot } }
    case 'node-live': return { ...state, live: { uri: v.uri, key: v.key, id: v.id, origin: v.origin } }
    case 'node-ready': return { ...state, status: 'running', uri: v.uri, key: v.key, dht: v.dht, readyMs: v.ms }
    case 'stopping': return { ...state, status: 'stopping' }
    case 'container-exited': return { ...state, status: 'exited', exitCode: v.exitCode, oomKilled: v.oomKilled, exitedAt: new Date(v.time).toISOString() }
    default: return state
  }
}

// The view, for whoever reads a node's state: the fold of its manager's topic.
// The node's state, the fold of its manager's topic; `from` an offset, to
// see only a run started after it (stateOffset, taken before the start).
export async function nodeState (folder, from = 0) {
  if (!existsSync(join(folder, 'topics', 'manager'))) return null
  const t = await topicOf(folder, 'manager')
  return (await t.consume(from)).reduce((s, r) => reduceNodeState(s, r.value), null)
}
export async function stateOffset (folder) {
  if (!existsSync(join(folder, 'topics', 'manager'))) return 0
  return (await topicOf(folder, 'manager')).endOffset()
}

export async function manageNode ({ folder, vault, image, boot, network, ip, swarm, name, role, aux = null, joining = null, origin = null, observer = false, memory = '1g', storeSize = '512m', codeSize = '256m', metricsEvery = 30000, sampleEvery = 15000 }) {
  mkdirSync(folder, { recursive: true })
  const container = `p2p-${swarm}-${name}`
  const t0 = Date.now()
  const topics = { manager: await topicOf(folder, 'manager'), node: await topicOf(folder, 'node') }
  // Every fact goes into the manager's topic; the state is the same
  // reducer's fold, kept as it goes and cached in state.json.
  let state = null
  let produced = Promise.resolve()
  let provision = null // the auxiliary link, once made; record() passes the state on through it
  // Written whole, by temporary file and rename: a reader never sees it
  // half written.
  const saveState = () => {
    writeFileSync(join(folder, 'state.json.tmp'), JSON.stringify(state, null, 2) + '\n')
    renameSync(join(folder, 'state.json.tmp'), join(folder, 'state.json'))
  }
  const record = (kind, facts = {}) => {
    const value = { module: 'p2p-node-manager', kind, time: Date.now(), ...facts }
    state = reduceNodeState(state, value)
    produced = topics.manager.produce({ value })
    saveState()
    if (provision && kind !== 'resources') provision.shadow(state)
  }
  const flush = () => produced
  record('starting', { swarm, name, role, container, image, boot, network, ip, memory, storeSize })
  if (origin) record(origin.kind, origin.facts)

  tryDocker('rm', '-f', container)
  // The store's tmpfs is noexec (Docker's default). A joining node runs code
  // it loads by replication, native addons among them, which load only from
  // a filesystem that allows execution: that code gets a tmpfs of its own,
  // exec, and nothing else does.
  const hardening = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '65534:65534',
    '--memory', memory, '--memory-swap', memory, '--ulimit', 'core=0', '--tmpfs', `/data:rw,noexec,nosuid,size=${storeSize},mode=1777`,
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,mode=1777',
    ...(role === 'join' ? ['--tmpfs', `/code:rw,exec,nosuid,size=${codeSize},mode=1777`] : [])]
  record('hardened', { hardening: ['read-only', 'cap-drop ALL', 'no-new-privileges', 'user 65534', `memory ${memory} no swap`, 'core 0', `store tmpfs ${storeSize} noexec`, 'tmp tmpfs 64m noexec', ...(role === 'join' ? [`code tmpfs ${codeSize} exec`] : [])] })

  // A joining node is provisioned through the auxiliary swarm: the
  // manager's peer, there for the node's life.
  provision = await provisioner({ aux, record, secret: () => vault.keyFor(swarm, name) })

  // Every node is provisioned through the auxiliary swarm (step 7: the
  // master too): its container starts on the auxiliary network with the
  // boot program, gets its secret from this manager on a channel, and keeps
  // that link, the management channel, for its life. The master then runs
  // from its image's code; a joining node from the swarm's.
  const roleFlags = role === 'master'
    ? ['--role=master', '--code=/app']
    : ['--role=join', '--app=/code/app', `--bootstrap=${joining.bootstrap}`, `--master=${joining.master}`,
        `--packages-key=${joining.packages.key}`, `--packages-commit=${joining.packages.commit}`, `--packages-uri=${joining.packages.uri}`]
  // The image has no code (a plain base and Bare): the boot program's code
  // is mounted from the host, read-only (`boot`: an assembled package's
  // folder); the master runs from it, a joining node from the swarm's.
  docker('create', '--name', container, '--network', aux.network, '--ip', aux.ip, ...hardening,
    '-v', `${boot}:/app:ro`, '--entrypoint', 'bare', image, '/app/modules/pear-full-square/p2p-node/cli.js', 'boot',
    `--swarm=${swarm}`, `--name=${name}`, `--host=${ip}`, '--storage=/data/store',
    `--aux-host=${aux.ip}`, `--aux-bootstrap=${aux.gateway}:${aux.port}`, `--manager=${provision.publicKey}`,
    ...roleFlags, ...(observer ? ['--observer=true'] : []), `--metrics-every=${metricsEvery}`)
  docker('network', 'connect', '--ip', ip, network, container)
  const child = spawn('docker', ['start', '-a', container], { stdio: ['ignore', 'pipe', 'pipe'] })

  let readyResolve, readyReject
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject })
  ready.catch(() => {})
  const stderr = openSync(join(folder, 'node.stderr'), 'a')
  child.stderr.on('data', chunk => writeSync(stderr, chunk))
  // The node's log, a line at a time.
  let rest = ''
  child.stdout.on('data', chunk => {
    rest += chunk.toString()
    let i
    while ((i = rest.indexOf('\n')) !== -1) {
      const line = rest.slice(0, i)
      rest = rest.slice(i + 1)
      if (line) take(line)
    }
  })
  function take (line) {
      let e
      try { e = JSON.parse(line) } catch { produced = topics.node.produce({ value: { text: line } }); return }
      // An observer's result carries its action's correlation in a header.
      const headers = e.module === 'splectral-p2p-observer' && e.kind === 'action-result' ? [{ key: 'correlation', value: String(e.id) }] : undefined
      produced = topics.node.produce({ value: e, headers })
      if (e.module === 'p2p-node' && e.kind === 'provisioning-key' && provision) {
        provision.authorise(e.publicKey)
      } else if (e.module === 'p2p-node' && e.kind === 'materialised') {
        record('materialised', { commit: e.commit, files: e.files, downloaded: e.downloaded, ms: e.ms })
      } else if (e.module === 'p2p-node' && e.kind === 'node-started') {
        record('node-ready', { uri: e.uri, key: e.owner, dht: e.dht, ms: Date.now() - t0 })
        readyResolve(state)
      } else if (e.module === 'splectral-p2p-observer' && e.kind === 'observer-attached') {
        followActions()
      } else if (e.module === 'p2p-node' && e.kind === 'genesis') {
        record('node-genesis', { packages: e.packages, boot: e.boot })
      } else if (e.module === 'p2p-node' && e.kind === 'live') {
        record('node-live', { uri: e.uri, key: e.key, id: e.id, origin: e.origin })
      } else if (e.module === 'p2p-node' && e.kind === 'failed') {
        record('node-failed', { error: e.error })
      }
  }

  // Actions for the node's observer: records produced into the node's
  // action topic (`topics/actions`, by whoever may act on this host); the
  // manager follows it from its committed offset and passes each over the
  // management channel. The result comes back on the node's log.
  let stopActions = null
  async function followActions () {
    if (stopActions) return
    const actionTopic = await topicOf(folder, 'actions')
    const offsets = await committedOffsets({ storage: folderStorage(join(folder, 'topics', 'actions-offsets')) })
    const from = ((await offsets.committed()) ?? -1) + 1
    let chain = Promise.resolve()
    stopActions = actionTopic.follow(from, rs => {
      for (const r of rs) {
        chain = chain.then(async () => {
          const action = { id: r.offset, action: r.value.action, with: r.value.with }
          try {
            await provision.send(action)
            record('action-passed', { id: r.offset, action: r.value.action })
          } catch (err) {
            record('action-failed', { id: r.offset, action: r.value.action, error: err.message })
          }
          await offsets.commit(r.offset)
        })
      }
      return chain
    })
  }

  // Resources, from outside: what only the container runtime sees.
  const sampler = setInterval(() => {
    const s = tryDocker('stats', '--no-stream', '--format', '{{json .}}', container)
    if (s) { const j = JSON.parse(s); record('resources', { cpu: j.CPUPerc, memory: j.MemUsage, memoryPercent: j.MemPerc, net: j.NetIO, pids: j.PIDs }) }
  }, sampleEvery)

  // 'close', not 'exit': after the node's output is all read (a graceful
  // stop's last lines, the node leaving, come just before the end).
  const done = new Promise(resolve => child.once('close', async code => {
    clearInterval(sampler)
    if (stopActions) stopActions()
    if (provision) await provision.close()
    const inspected = tryDocker('inspect', '--format', '{{json .State}}', container)
    const s = inspected ? JSON.parse(inspected) : {}
    tryDocker('rm', container)
    try { closeSync(stderr) } catch {}
    record('container-exited', { exitCode: s.ExitCode ?? code, oomKilled: !!s.OOMKilled, error: s.Error || null, ms: Date.now() - t0 })
    readyReject(new Error('the node exited before it was ready'))
    await flush()
    resolve(state)
  }))

  return {
    container,
    get state () { return state },
    ready,
    done,
    flush,
    async stop (timeout = 15) {
      record('stopping', { signal: 'SIGTERM', timeout })
      // Asynchronous: the node's output keeps being read while it stops (a
      // synchronous call blocks this loop, the pipe fills, and the node's
      // last lines are lost).
      await new Promise(resolve => spawn('docker', ['stop', '-t', String(timeout), container], { stdio: ['ignore', 'ignore', 'ignore'] }).once('exit', () => resolve()))
      const end = await done
      record('stopped', { exitCode: end.exitCode, graceful: end.exitCode === 0 })
      await flush()
      return end
    }
  }
}

export async function joinFromInvitation ({ invitation: inv, folder, vault, name, ip, auxSubnet, ...rest }) {
  const aux = { network: `p2p-${inv.swarm}-${name}-aux`, gateway: `${auxSubnet}.1`, port: 49740, ip: `${auxSubnet}.2` }
  tryDocker('network', 'rm', aux.network)
  docker('network', 'create', '--internal', '--subnet', `${auxSubnet}.0/24`, '--gateway', aux.gateway, aux.network)
  const m = await manageNode({
    origin: { kind: 'aux-network-created', facts: { network: aux.network, subnet: `${auxSubnet}.0/24`, from: 'invitation', swarm: inv.swarm, master: inv.master } },
    folder, vault, image: inv.image, network: inv.network.name, ip, swarm: inv.swarm, name, role: 'join', aux,
    joining: { master: inv.master, bootstrap: inv.bootstrap, packages: inv.packages }, ...rest
  })
  m.done.then(() => tryDocker('network', 'rm', aux.network))
  return m
}

// The manager's peer on the auxiliary swarm: a DHT of its own at the
// network's gateway, and a key of its own for this run. It admits only the
// key it is told to authorise, and gives that peer the secret once.
async function provisioner ({ aux, record, secret }) {
  const keyPair = crypto.keyPair()
  const dht = await startBootstrap({ host: aux.gateway, port: aux.port })
  let authorised = null
  let given = false
  const net = connect({ dht: dht.nodes[0], keyPair, admit: key => authorised !== null && key.toString('hex') === authorised })
  await net.swarm.listen()
  let toNode = null
  net.onConnection((stream, peer) => {
    record('provisioning-connected', { peer: peer.peer })
    const ch = openChannel(stream, {
      name: 'p2p-provision',
      peer: peer.peer,
      onrequest: body => {
        if (body.op !== 'secret') throw new Error(`unknown op: ${body.op}`)
        if (peer.peer !== authorised || given) { record('secret-refused', { peer: peer.peer, given }); throw new Error('not authorised') }
        given = true
        record('secret-handed-over', { via: 'auxiliary swarm', to: peer.peer })
        return { primaryKey: secret() }
      }
    })
    // The management channel: kept, to the authorised node only.
    if (peer.peer === authorised) toNode = ch
  })
  record('provisioning-ready', { gateway: aux.gateway, port: aux.port, network: aux.network, publicKey: keyPair.publicKey.toString('hex') })
  return {
    publicKey: keyPair.publicKey.toString('hex'),
    authorise (key) { authorised = key; record('provisioning-authorised', { peer: key }) },
    // An action for the node's observer, over the management channel.
    async send (action) {
      if (!toNode) throw new Error('no management channel yet')
      await toNode.opened
      return toNode.request({ op: 'action', action })
    },
    // The manager's state, for the node's shadow of it (step 10): a
    // message, read-only on the node's side; dropped while there is no channel.
    shadow (state) { if (toNode) toNode.opened.then(() => toNode.send({ op: 'shadow', state }), () => {}) },
    async close () { await net.close(); await dht.close() }
  }
}

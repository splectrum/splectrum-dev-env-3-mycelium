// p2p-swarm-manager — a swarm's manager, on the host machine: it manages
// the nodes it controls (a swarm manager may control one node only, the
// master), through their node managers, and keeps the swarm's record.
//   await genesis({ swarm, folder, nodes, vault, code })   the swarm from zero
//   await joinNode({ folder, node })                       a node joining it
//   await status({ folder })                               the swarm as p2p-rns sees it
//   invite({ folder })                                     what another host is given to join
//   await restart({ folder, node }), await stop({ folder })
//   await start({ folder })                                a stopped swarm, as described
//   await stopNode({ folder, node })                       one node, gracefully: shut down
//                                                          (every party let go first), held
//   await releaseNode({ folder, node })                    held no more: may be kept again
//   describe({ folder })                                   the swarm as recorded (or null)
//   genesis({ ..., deployment })                           the swarm's part handed over at genesis
//   await setDeployment({ folder, deployment }), readDeployment({ folder }), watch({ folder, auto })
//                                                          the deployment on the swarm (deployment.js)
//
// Folders stand side by side under `nodes` (no hierarchy): the swarm
// manager's own (`folder`: its topic, swarm.json its cache) and one per node (its
// node manager's). The vault is a folder of its own. A node manager runs as
// a process of its own, detached: it keeps its node running when the swarm
// manager is not. The swarm manager asks p2p-rns as a peer of the swarm,
// from the host, on the swarm's internal network.
//
// Two internal networks per swarm: the swarm's own (the data plane) and an
// auxiliary one (the management plane), where each joining node's manager
// provisions it; the host is the gateway of both.
//
// Nodes on other hosts (step 6): the data plane is one network every node
// reaches (a DHT node has one address: a master on two networks is reached
// on one only); across hosts, an overlay or the hosts' LAN. Each host's
// management plane is its own: another host's node manager makes its own
// auxiliary network and keeps its own vault. Such a node is the swarm's,
// seen by p2p-rns, but not this manager's: status tells them apart.

import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync, openSync, rmSync } from 'node:fs'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'hypercore-crypto'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { openChannel } from 'p2p-channel'
import { rnsClient } from 'p2p-rns'
import { swarmTopic } from 'p2p-node'
import { nodeState, stateOffset } from '../p2p-node-manager/index.js'
import { setDeployment } from './deployment.js'
import { requestShutdown, release } from './shutdown.js'
export { setDeployment, readDeployment, watch } from './deployment.js'

const here = dirname(fileURLToPath(import.meta.url))
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const tryDocker = (...args) => { try { return docker(...args) } catch { return null } }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The swarm's record: a topic (mycelium-topic) in the swarm manager's
// folder, `topics/swarm`. What the swarm is, is a view: the fold of its
// `described` records, cached in swarm.json.
const writes = new Set()
export const settled = () => Promise.all([...writes])

async function swarmRecord (folder) {
  const topic = await openTopic({ storage: folderStorage(join(folder, 'topics', 'swarm')) })
  const produce = value => {
    const p = topic.produce({ value })
    writes.add(p)
    p.finally(() => writes.delete(p))
    return p
  }
  const record = (kind, facts = {}) => produce({ module: 'p2p-swarm-manager', kind, time: Date.now(), ...facts })
  const read = async () => {
    const s = await topic.fold((at, r) => r.value.kind === 'described' ? r.value.swarm : at, null)
    if (!s) throw new Error(`no swarm described in ${folder}`)
    return s
  }
  const write = s => {
    writeFileSync(join(folder, 'swarm.json'), JSON.stringify(s, null, 2) + '\n')
    return produce({ module: 'p2p-swarm-manager', kind: 'described', time: Date.now(), swarm: s })
  }
  return { record, read, write }
}

// The swarm's two internal networks, made anew: the data plane and the
// management plane; the host the gateway of both.
function networks (s, record) {
  tryDocker('network', 'rm', s.network)
  docker('network', 'create', '--internal', '--subnet', `${s.subnet}.0/24`, '--gateway', `${s.subnet}.1`, s.network)
  record('network-created', { network: s.network, subnet: `${s.subnet}.0/24`, internal: true })
  tryDocker('network', 'rm', s.aux.network)
  docker('network', 'create', '--internal', '--subnet', s.aux.subnet, '--gateway', s.aux.gateway, s.aux.network)
  record('network-created', { network: s.aux.network, subnet: s.aux.subnet, internal: true, plane: 'management' })
}

// Start a node's manager, detached, and wait for its node to be ready.
async function startNodeManager (s, node, { vault, timeout = 180000 }) {
  const folder = node.folder
  mkdirSync(folder, { recursive: true })
  // The previous run's state is the previous run's: cleared, so only this
  // run's is read.
  const from = await stateOffset(folder) // this run's records, from here
  const out = openSync(join(folder, 'manager.out'), 'a')
  const joining = [`--aux-network=${s.aux.network}`, `--aux-gateway=${s.aux.gateway}`, `--aux-port=${node.auxPort}`, `--aux-ip=${node.auxIp}`,
    ...(node.role === 'join' ? [`--master=${s.master.key}`, `--bootstrap=${s.dht.host}:${s.dht.port}`,
    `--packages-uri=${s.master.packages.uri}`, `--packages-key=${s.master.packages.key}`, `--packages-commit=${s.master.packages.commit}`] : [])]
  const child = spawn(process.execPath, [join(here, '..', 'p2p-node-manager', 'cli.js'), 'run',
    `--folder=${folder}`, `--vault=${vault}`, `--image=${s.image}`, `--network=${s.network}`, `--ip=${node.ip}`,
    `--swarm=${s.swarm}`, `--name=${node.name}`, `--role=${node.role}`, '--observer=true', ...joining], { detached: true, stdio: ['ignore', out, out] })
  child.unref()
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    // The node's state is its manager's fold (state.json is only a cache,
    // and may be read half written): this run's records only.
    const st = await nodeState(folder, from)
    if (st && st.status === 'running') return { ...st, managerPid: child.pid, ms: Date.now() - t0 }
    if (st && st.status === 'exited') throw new Error(`${node.name} exited before it was ready (exit ${st.exitCode})`)
    await sleep(500)
  }
  throw new Error(`${node.name}: not ready within ${timeout} ms`)
}

export async function genesis ({ swarm, folder, nodes, vault, code, subnet = '172.34.0', auxSubnet = '172.35.0', deployment = null }) {
  mkdirSync(folder, { recursive: true })
  // Its owner (haicc's mark): this manager, unless a project made it (the
  // project's provider marks it its own). What is owned may be stopped.
  if (!existsSync(join(folder, 'haicc-owner'))) writeFileSync(join(folder, 'haicc-owner'), 'p2p-swarm-manager\n')
  const { record, write } = await swarmRecord(folder)
  const t0 = Date.now()
  record('genesis-started', { swarm })
  const image = execFileSync('sh', [join(here, '..', 'p2p-node-manager', 'image', 'build.sh'), code], { encoding: 'utf8' }).trim()
  record('image-built', { image, ms: Date.now() - t0 })
  const network = `p2p-${swarm}`
  const aux = { network: `p2p-${swarm}-aux`, subnet: `${auxSubnet}.0/24`, gateway: `${auxSubnet}.1` }
  networks({ network, subnet, aux }, record)
  // The master is provisioned through the auxiliary swarm too (step 7):
  // index 0 there, as joining nodes are 1, 2, ...
  const master = { name: 'master', role: 'master', ip: `${subnet}.2`, auxIp: `${auxSubnet}.9`, auxPort: 49740, folder: join(nodes, `${swarm}-master`) }
  const s = { swarm, image, network, subnet, gateway: `${subnet}.1`, aux, nodes: [master], vault, dht: { host: master.ip, port: 49737 }, nodesFolder: nodes, created: new Date().toISOString() }
  write(s)
  const ready = await startNodeManager(s, master, { vault })
  s.nodes[0] = { ...master, uri: ready.uri, key: ready.key, managerPid: ready.managerPid }
  s.master = { uri: ready.uri, key: ready.key, packages: { uri: `/${swarm}/master/packages`, ...ready.genesis?.packages }, boot: ready.genesis?.boot }
  write(s)
  record('master-ready', { uri: ready.uri, key: ready.key, packages: ready.genesis?.packages?.commit, ms: Date.now() - t0 })
  // The handover (step 10): the swarm's part of the deployment, given with
  // the swarm, set on the swarm; from here the swarm is its authority.
  if (deployment) {
    const set = await setDeployment({ folder, deployment })
    record('deployment-handed-over', { commit: set.commit, nodes: deployment.nodes })
  }
  return s
}

// A node joining: its node manager provisions it through the auxiliary
// network; the node runs from the master's packages.
export async function joinNode ({ folder, node: name }) {
  const { record, read, write } = await swarmRecord(folder)
  const s = await read()
  if (s.nodes.some(n => n.name === name)) throw new Error(`already a node: ${name}`)
  const i = s.nodes.length
  const subnet = s.subnet
  const node = { name, role: 'join', ip: `${subnet}.${2 + i}`, auxIp: `${s.aux.gateway.replace(/\.1$/, '')}.${9 + i}`, auxPort: 49740 + i, folder: join(s.nodesFolder, `${s.swarm}-${name}`) }
  s.nodes.push(node)
  write(s)
  record('join-started', { node: name, ip: node.ip, auxIp: node.auxIp })
  const ready = await startNodeManager(s, node, { vault: s.vault })
  s.nodes[i] = { ...node, uri: ready.uri, key: ready.key, managerPid: ready.managerPid, materialised: ready.materialised }
  write(s)
  record('node-joined', { node: name, uri: ready.uri, key: ready.key, materialised: ready.materialised, ms: ready.ms })
  return s.nodes[i]
}

// The swarm as p2p-rns sees it: asked from the host, as a peer of the
// swarm on its internal network (the host's address there: the gateway).
export async function status ({ folder }) {
  const { record, read } = await swarmRecord(folder)
  const s = await read()
  const t0 = Date.now()
  const d = await startDht({ host: s.gateway, bootstrap: [s.dht] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rns = await new Promise((resolve, reject) => {
    const limit = setTimeout(() => reject(new Error('the swarm did not answer')), 30000)
    net.onConnection((stream, peer) => { clearTimeout(limit); resolve(rnsClient(openChannel(stream, { name: 'p2p-rns', peer: peer.peer }))) })
    net.join(swarmTopic(s.swarm), { server: false, client: true }).catch(reject)
  })
  const nodes = await rns.list(`/${s.swarm}/*`)
  const resources = await rns.list(`/${s.swarm}/*/*`)
  const managers = await Promise.all(s.nodes.map(async n => (await nodeState(n.folder)) || { name: n.name, status: 'unknown' }))
  await net.close()
  await d.close()
  // Controlled: the nodes this manager started (through their managers);
  // the others joined from elsewhere, under managers of their own.
  const mine = new Set(s.nodes.map(n => `/${s.swarm}/${n.name}`))
  const result = {
    swarm: s.swarm,
    nodes: nodes.map(n => ({ ...n, controlled: mine.has(n.uri) })),
    resources,
    managers: managers.map(m => ({ name: m.name, status: m.status, uri: m.uri, key: m.key })),
    ms: Date.now() - t0
  }
  record('status', { nodes: nodes.map(n => n.uri), controlled: result.nodes.filter(n => n.controlled).map(n => n.uri), resources: resources.map(r => r.uri), ms: result.ms })
  return result
}

// What another host is given to join the swarm: public facts only (no
// secret, no key but public ones, nothing of this host's management
// plane). That host's node manager makes the rest its own.
export async function invite ({ folder }) {
  const { record, read } = await swarmRecord(folder)
  const s = await read()
  const invitation = {
    swarm: s.swarm,
    network: { name: s.network, subnet: `${s.subnet}.0/24`, gateway: s.gateway },
    bootstrap: `${s.dht.host}:${s.dht.port}`,
    master: s.master.key,
    packages: { uri: s.master.packages.uri, key: s.master.packages.key, commit: s.master.packages.commit },
    image: s.image
  }
  record('invited', { swarm: s.swarm, master: s.master.key, packages: s.master.packages.commit })
  return invitation
}

// The node's manager stopped: the process signalled, waited for (not its
// pid file, which a next manager would write again).
async function stopNodeManager (node, timeout = 60000) {
  const pidFile = join(node.folder, 'manager.pid')
  if (!existsSync(pidFile)) return null
  const pid = Number(readFileSync(pidFile, 'utf8'))
  try { process.kill(pid, 'SIGTERM') } catch { return null }
  const t0 = Date.now()
  const alive = () => { try { process.kill(pid, 0); return true } catch { return false } }
  while (alive()) {
    if (Date.now() - t0 > timeout) throw new Error(`${node.name}'s manager (pid ${pid}) did not stop within ${timeout} ms`)
    await sleep(100)
  }
  return nodeState(node.folder)
}

export async function restart ({ folder, node: name }) {
  const { record, read, write } = await swarmRecord(folder)
  const s = await read()
  const i = s.nodes.findIndex(n => n.name === name)
  const before = await stopNodeManager(s.nodes[i])
  record('node-stopped', { node: name, exitCode: before?.exitCode })
  const ready = await startNodeManager(s, s.nodes[i], { vault: s.vault })
  s.nodes[i] = { ...s.nodes[i], uri: ready.uri, key: ready.key, managerPid: ready.managerPid }
  write(s)
  record('node-restarted', { node: name, key: ready.key, packages: ready.genesis?.packages?.commit, sameKey: ready.key === before?.key, ms: ready.ms })
  // Started on purpose: a hold on it ends.
  await release({ folder, node: name, by: 'restart' })
  return { before, after: ready }
}

// A stopped swarm started again, as it was described: its networks, then
// its nodes' managers, the master first (its identity kept by the vault:
// the same keys and ids). Nodes already running are left as they are.
export async function start ({ folder }) {
  const { record, read, write } = await swarmRecord(folder)
  const s = await read()
  const t0 = Date.now()
  record('start-started', { swarm: s.swarm })
  const running = async n => (await nodeState(n.folder))?.status === 'running'
  if (!(await running(s.nodes[0]))) networks(s, record)
  for (let i = 0; i < s.nodes.length; i++) {
    if (await running(s.nodes[i])) continue
    const ready = await startNodeManager(s, s.nodes[i], { vault: s.vault })
    s.nodes[i] = { ...s.nodes[i], uri: ready.uri, key: ready.key, managerPid: ready.managerPid }
  }
  write(s)
  record('swarm-started', { nodes: s.nodes.map(n => n.name), ms: Date.now() - t0 })
  return s
}

// One node stopped (its manager stops it gracefully); the swarm runs on.
// Its prerequisite: a shutdown requested and every party holding on to the
// node let go first (the watcher, in auto mode, would bring it back); held
// until released (releaseNode, or the project's reconcile). `hold: false`:
// a stop within the substrate's own work (restart), no shutdown.
export async function stopNode ({ folder, node: name, by = 'swarm-manager', hold = true }) {
  const { record, read } = await swarmRecord(folder)
  const s = await read()
  const n = s.nodes.find(x => x.name === name)
  if (!n) throw new Error(`no node: ${name}`)
  if (hold) {
    const asked = await requestShutdown({ folder, node: name, by })
    record('node-shutdown-ready', { node: name, request: asked.request, parties: asked.parties, ms: asked.ms })
  }
  const end = await stopNodeManager(n)
  record('node-stopped', { node: name, exitCode: end?.exitCode })
  return end
}

// A held node may be kept again (the watcher, in auto mode, brings it back).
export async function releaseNode ({ folder, node, by = 'swarm-manager' }) {
  const offset = await release({ folder, node, by })
  return { node, released: offset !== null }
}

export async function describe ({ folder }) {
  if (!existsSync(join(folder, 'topics', 'swarm'))) return null
  try { return await (await swarmRecord(folder)).read() } catch { return null }
}

export async function stop ({ folder }) {
  const { record, read } = await swarmRecord(folder)
  const s = await read()
  const ended = []
  for (const n of [...s.nodes].reverse()) ended.push(await stopNodeManager(n))
  tryDocker('network', 'rm', s.network)
  if (s.aux) tryDocker('network', 'rm', s.aux.network)
  record('swarm-stopped', { nodes: ended.map(e => e && { name: e.name, exitCode: e.exitCode }) })
  return ended
}

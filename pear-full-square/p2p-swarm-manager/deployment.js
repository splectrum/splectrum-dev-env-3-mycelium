// The swarm's deployment, from the swarm manager's side (step 10). The
// swarm is its authority: the deployment lives in the master's
// `deployment` repository; the manager keeps to the substrate.
//   await setDeployment({ folder, deployment })   handed over (at genesis) or changed: a request to the master
//   await readDeployment({ folder })              followed as a replica; shadowed in topics/deployment
//   const w = await watch({ folder, auto })        follows it: manual mode reports what the
//                                                  substrate would need, auto mode makes it so
//   await w.stop()
// The manager is a peer of the swarm, from the host, on the swarm's
// internal network (the host's address there: the gateway).
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { rnsClient } from 'p2p-rns'
import { mrepos } from 'p2p-mrepo'
import { askRequest, requestBundle } from 'p2p-node'
import { openRepo } from '../mycelium-git/index.js'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'
import { createEngine } from '../haicc-reconcile/index.js'
import { describe } from './index.js'
import { providers } from './reconcile.js'
import { endOffset, letGo } from './shutdown.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// A peer of the swarm, connected to its master: the name service, requests,
// replicas.
async function peerOf (s) {
  const storage = mkdtempSync(join(tmpdir(), 'swarm-peer-'))
  const store = await openStore({ storage })
  const d = await startDht({ host: s.gateway, bootstrap: [s.dht] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rep = replicator({ store })
  const channels = new Map()
  net.onConnection((stream, p) => {
    rep.replicate(stream, { peer: p.peer })
    channels.set(p.peer, { rns: rnsClient(openChannel(stream, { name: 'p2p-rns', peer: p.peer })), requests: openChannel(stream, { name: 'p2p-request', peer: p.peer }) })
  })
  net.connectTo(Buffer.from(s.master.key, 'hex'))
  for (let i = 0; i < 1500 && !channels.has(s.master.key); i++) await sleep(20)
  const master = channels.get(s.master.key)
  if (!master) throw new Error('the master did not answer')
  const repos = mrepos({ store })
  let replica = null
  return {
    master,
    // The deployment repository, as a replica, kept up to date.
    async deployment () {
      if (!replica) {
        const record = await master.rns.resolve(`/${s.swarm}/master/deployment`)
        if (!record) throw new Error('the swarm has no deployment repository')
        replica = await repos.replica(record.key)
        rep.track(replica.drive)
      }
      await replica.drive.update({ wait: true })
      const main = Object.fromEntries(await replica.backend.listBranches()).main
      const value = JSON.parse((await openRepo(replica.backend).read('/main/deployment.json')).toString())
      return { commit: main, deployment: value }
    },
    async request (name, files) {
      const outbox = await repos.create(`outbox-${Date.now().toString(36)}`)
      return askRequest(master.requests, { name, bundle: await requestBundle(outbox.backend, files) })
    },
    async close () { await net.close(); await d.close(); await store.close(); rmSync(storage, { recursive: true, force: true }) }
  }
}

const shadowTopic = folder => openTopic({ storage: folderStorage(join(folder, 'topics', 'deployment')) })

// Shadowed: each new commit of the swarm's deployment, as the manager saw it.
async function shadow (folder, seen) {
  const t = await shadowTopic(folder)
  const last = await t.fold((at, r) => r.value.commit, null)
  if (last === seen.commit) return false
  await t.produce({ value: { module: 'p2p-swarm-manager', kind: 'deployment', time: Date.now(), commit: seen.commit, deployment: seen.deployment } })
  return true
}

export async function setDeployment ({ folder, deployment }) {
  const s = await describe({ folder })
  const peer = await peerOf(s)
  try {
    const name = `deployment-${Date.now().toString(36)}`
    const answer = await peer.request(name, { 'request.md': '# Request: the swarm\'s deployment\n\nDeployment: set\n', 'deployment.json': JSON.stringify(deployment, null, 2) + '\n' })
    const seen = await peer.deployment()
    if (JSON.stringify(seen.deployment) !== JSON.stringify(deployment)) throw new Error(`not set (request ${name}: see the master's response)`)
    await shadow(folder, seen)
    return { request: name, executed: answer.executed, commit: seen.commit }
  } finally { await peer.close() }
}

export async function readDeployment ({ folder }) {
  const s = await describe({ folder })
  const peer = await peerOf(s)
  try {
    const seen = await peer.deployment()
    await shadow(folder, seen)
    return seen
  } finally { await peer.close() }
}

// What the deployment asks of this manager's substrate, as requirements of
// haicc-reconcile's swarm providers (strict: its own extras stopped).
export const requirementsOf = (folder, deployment) => deployment.nodes.map(n => n.name
  ? { name: n.name, kind: 'node', want: { swarm: folder, name: n.name } }
  : { name: `${n.prefix}nodes`, kind: 'nodes', want: { swarm: folder, prefix: n.prefix, atLeast: n.atLeast } })

const ownerOf = folder => existsSync(join(folder, 'haicc-owner')) ? readFileSync(join(folder, 'haicc-owner'), 'utf8').trim() : 'p2p-swarm-manager'

export async function watch ({ folder, auto = false, every = 3000, onRound = null }) {
  const s = await describe({ folder })
  const peer = await peerOf(s)
  const log = await shadowTopic(folder)
  const engine = createEngine({ providers, owner: ownerOf(folder) })
  let stopped = false
  let lastApplied = null
  let reported = null // manual mode: the commit last reported (each once, the first at the start)
  const loop = (async () => {
    while (!stopped) {
      // Shutdown requests there at the start of this round: let go of after
      // it (the providers leave a held node alone from now on).
      const upTo = await endOffset(folder).catch(() => 0)
      try {
        const seen = await peer.deployment()
        const changed = await shadow(folder, seen)
        const reqs = requirementsOf(folder, seen.deployment)
        if (auto) {
          const plan = await engine.plan(reqs, { strict: true })
          if (plan.length || changed) {
            const r = await engine.apply(reqs, { strict: true })
            await log.produce({ value: { module: 'p2p-swarm-manager', kind: 'deployment-applied', time: Date.now(), commit: seen.commit, done: r.done.map(x => `${x.name}:${x.action}`), failed: r.failed.map(x => x.name) } })
            lastApplied = seen.commit
          }
        } else if (seen.commit !== reported) {
          reported = seen.commit
          const plan = await engine.plan(reqs, { strict: true })
          await log.produce({ value: { module: 'p2p-swarm-manager', kind: 'deployment-pending', time: Date.now(), commit: seen.commit, mode: 'manual', wouldDo: plan.map(x => `${x.name}:${x.action}`) } })
        }
        if (onRound) await onRound({ seen, changed, lastApplied })
      } catch (err) {
        await log.produce({ value: { module: 'p2p-swarm-manager', kind: 'watch-failed', time: Date.now(), error: err.message } })
      }
      try {
        const let_ = await letGo(folder, 'swarm-watcher', upTo)
        if (let_.length) await log.produce({ value: { module: 'p2p-swarm-manager', kind: 'let-go', time: Date.now(), nodes: let_ } })
      } catch {}
      for (let i = 0; i < every / 100 && !stopped; i++) await sleep(100)
    }
  })()
  return { async stop () { stopped = true; await loop; await peer.close() } }
}

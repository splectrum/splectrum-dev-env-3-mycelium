// The boot program: what a joining node's container runs first, from its
// image (the join closure). It is provisioned and then runs the node from
// the swarm's code, not the image's.
//   1. An ephemeral keypair; its public key to the log, where the node
//      manager reads it and authorises exactly that key.
//   2. The auxiliary swarm (the manager's peer, on an internal network with
//      the host only): connected to the manager by its key, the node's
//      secret asked for on a channel, into memory.
//   3. The code by replication: the master's packages, opened by key from a
//      replica on the swarm, the commit checked against the one it was told
//      to run, the deployed tree materialised into the RAM store's folder.
//   4. The node, started from that code with its secret on stdin (the
//      master skips 3: it runs from its image's code); this
//      program stays, the parent: it keeps the auxiliary link (the
//      management channel), passes SIGTERM on, and exits as the node does.
// Every step to the log, as JSON lines; never the secret.

import process from 'bare-process'
import { spawn } from 'bare-subprocess'
import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { mrepos } from 'p2p-mrepo'
import { extract } from '../mycelium-layer/index.js'

const hostPort = s => { const [host, port] = s.split(':'); return { host, port: Number(port) } }

let toNode = null

export async function boot (flags, log) {
  const t0 = Date.now()
  const emit = (kind, facts = {}) => log({ module: 'p2p-node', kind, time: Date.now(), role: 'boot', ...facts })

  // 1. Who this container is, for now: a key nobody else knows yet.
  const provisioning = crypto.keyPair()
  emit('provisioning-key', { publicKey: provisioning.publicKey.toString('hex') })

  // 2. The secret, from the node manager, on the auxiliary swarm.
  const auxDht = await startDht({ host: flags['aux-host'], bootstrap: [hostPort(flags['aux-bootstrap'])], observer: log })
  const manager = Buffer.from(flags.manager, 'hex')
  const aux = connect({ dht: auxDht.dht, keyPair: provisioning, admit: key => key.equals(manager), observer: log })
  const provisionChannel = new Promise(resolve => aux.onConnection((stream, peer) => {
    if (peer.peer === flags.manager) {
      resolve(openChannel(stream, {
        name: 'p2p-provision',
        peer: peer.peer,
        observer: log,
        // The management channel, from the manager: actions for the
        // observer, passed to the node's process on its stdin.
        // The manager's state, for the node's shadow: passed on as a line.
        onmessage: body => { if (body.op === 'shadow' && toNode) toNode.write(JSON.stringify({ shadow: body.state }) + '\n') },
        onrequest: body => {
          if (body.op !== 'action' || !toNode) throw new Error(`not taken: ${body.op}`)
          toNode.write(JSON.stringify(body.action) + '\n')
          return { passed: true }
        }
      }))
    }
  }))
  aux.connectTo(manager)
  const channel = await provisionChannel
  await channel.opened
  const { primaryKey } = await channel.request({ op: 'secret' })
  emit('secret-received', { bytes: primaryKey.length / 2, via: 'auxiliary swarm', ms: Date.now() - t0 })

  const args = flags.role === 'master'
    ? [`${flags.code}/modules/pear-full-square/p2p-node/cli.js`, 'master', `--swarm=${flags.swarm}`, `--name=${flags.name}`, `--host=${flags.host}`,
        `--storage=${flags.storage}`, `--code=${flags.code}`, `--metrics-every=${flags['metrics-every'] || 30000}`]
    : await joinCode(flags, log, emit, provisioning, t0)

  // 4. The node, from its code, with its secret on stdin; this program
  // stays, the parent: it keeps the auxiliary link (the management
  // channel), passes SIGTERM on, and exits as the node does.
  const observer = flags.observer === 'true'
  const child = spawn('bare', observer ? [...args, '--observer=true'] : args, { stdio: ['pipe', 'inherit', 'inherit'] })
  // The secret first; with an observer, stdin stays open for its actions.
  if (observer) { child.stdin.write(primaryKey + '\n'); toNode = child.stdin } else child.stdin.end(primaryKey + '\n')
  emit('node-spawned', { role: flags.role || 'join', code: flags.role === 'master' ? flags.code : flags.app, ms: Date.now() - t0 })
  process.on('SIGTERM', () => child.kill('SIGTERM'))
  process.on('SIGINT', () => child.kill('SIGTERM'))
  const code = await new Promise(resolve => child.on('exit', resolve))
  emit('node-exited', { code })
  await aux.close()
  await auxDht.close()
  return code
}

// 3. A joining node's code: the master's packages, at the commit it was
// told to run, materialised from a replica; the arguments to run it with.
async function joinCode (flags, log, emit, provisioning, t0) {
  const store = await openStore({ storage: `${flags.storage}-boot`, observer: log })
  const dht = await startDht({ host: flags.host, bootstrap: [hostPort(flags.bootstrap)], observer: log })
  const net = connect({ dht: dht.dht, keyPair: provisioning, observer: log })
  const rep = replicator({ store, observer: log })
  const toMaster = new Promise(resolve => net.onConnection((stream, peer) => {
    rep.replicate(stream, { peer: peer.peer })
    if (peer.peer === flags.master) resolve()
  }))
  const packages = await mrepos({ store, observer: log }).replica(flags['packages-key'])
  rep.track(packages.drive)
  net.connectTo(Buffer.from(flags.master, 'hex'))
  // An update before the master is connected finds nothing to wait for.
  await toMaster
  await packages.drive.update({ wait: true })
  const commit = Object.fromEntries(await packages.backend.listBranches())['capability/default']
  if (commit !== flags['packages-commit']) throw new Error(`the packages are at ${commit}, not ${flags['packages-commit']}`)
  const done = await extract({ backend: packages.backend, layer: 'capability/default', folder: flags.app })
  const down = rep.metrics().reduce((a, m) => ({ blocks: a.blocks + m.downloaded.blocks, bytes: a.bytes + m.downloaded.bytes }), { blocks: 0, bytes: 0 })
  emit('materialised', { packages: flags['packages-key'], commit, files: done.files, downloaded: down, ms: Date.now() - t0 })
  await net.close()
  await dht.close()
  await store.close()

  const args = [`${flags.app}/modules/pear-full-square/p2p-node/cli.js`, 'join', `--swarm=${flags.swarm}`, `--name=${flags.name}`, `--host=${flags.host}`,
    `--storage=${flags.storage}`, `--bootstrap=${flags.bootstrap}`, `--master=${flags.master}`,
    `--packages-key=${flags['packages-key']}`, `--packages-commit=${commit}`, `--packages-uri=${flags['packages-uri']}`,
    `--metrics-every=${flags['metrics-every'] || 30000}`]
  return args
}

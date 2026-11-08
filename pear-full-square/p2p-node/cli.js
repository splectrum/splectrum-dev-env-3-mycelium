#!/usr/bin/env bare
// The node application, from the command line (its container's command).
//   bare cli.js master --swarm=<name> --name=<node> --host=<ip> --storage=<dir>
//                      --code=<folder> [--dht-port=49737]
//   bare cli.js boot   --swarm --name --host --storage --app --aux-host
//                      --aux-bootstrap=<host:port> --manager=<key> --bootstrap=<host:port>
//                      --master=<key> --packages-key --packages-commit --packages-uri
//                      (a joining node: provisioned, then run from the swarm's code)
//   bare cli.js join   --swarm --name --host --storage --bootstrap --master
//                      [--packages-key --packages-commit --packages-uri]
//                      (without them: the master's packages, as p2p-rns names them)
// For master and join, the node's primary key: from --key-file=<file> (the
// node's config, node.json, its `key`, as hex; for now, in readable text:
// a more secure way once it all runs), else first on stdin, as hex, from
// its node manager (or, for join, its boot program). Everything the node does goes
// to stdout as JSON lines (its log: the audit and metrics of every module),
// which the node manager follows. SIGTERM stops it gracefully.

import process from 'bare-process'
import fs from 'bare-fs'
import { startNode } from './index.js'
import { validateName } from '../mycelium-uri/index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [role] = argv.filter(a => !a.startsWith('--'))
// Written synchronously: a line written just before the process exits (a
// failure's last words) is not lost, as an asynchronous write on Bare is.
const log = e => fs.writeSync(1, JSON.stringify(e) + '\n')

function readSecret () {
  if (flags['key-file']) {
    const text = fs.readFileSync(flags['key-file'], 'utf8').trim()
    const key = Buffer.from(text.startsWith('{') ? JSON.parse(text).key || '' : text, 'hex')
    if (key.length !== 32) return Promise.reject(new Error(`${flags['key-file']}: no primary key in it (32 bytes of hex)`))
    return Promise.resolve(key)
  }
  return new Promise((resolve, reject) => {
    let text = ''
    const ondata = chunk => {
      text += chunk.toString()
      const end = text.indexOf('\n')
      if (end === -1) return
      process.stdin.removeListener('data', ondata)
      process.stdin.pause()
      const key = Buffer.from(text.slice(0, end).trim(), 'hex')
      text = ''
      if (key.length !== 32) reject(new Error('the primary key on stdin is not 32 bytes of hex'))
      else resolve(key)
    }
    process.stdin.on('data', ondata)
    process.stdin.once('end', () => reject(new Error('no primary key on stdin')))
  })
}

const hostPort = s => { const [host, port] = s.split(':'); return { host, port: Number(port) } }

try {
  // The boundary: names from the command line, validated once.
  validateName(flags.swarm, 'swarm name')
  validateName(flags.name, 'node name')
  if (role === 'boot') {
    const { boot } = await import('./boot.js')
    process.exit(await boot(flags, log))
  }
  const primaryKey = await readSecret()
  log({ module: 'p2p-node', kind: 'secret-received', time: Date.now(), bytes: primaryKey.length })
  const node = await startNode({
    role,
    swarm: flags.swarm,
    name: flags.name,
    storage: flags.storage,
    primaryKey,
    host: flags.host,
    dhtPort: Number(flags['dht-port'] || 49737),
    code: flags.code,
    ...(role === 'join' ? {
      bootstrap: [hostPort(flags.bootstrap)],
      master: flags.master,
      packages: flags['packages-key'] ? { uri: flags['packages-uri'], key: flags['packages-key'], commit: flags['packages-commit'] } : null
    } : {}),
    observer: log,
    metricsEvery: Number(flags['metrics-every'] || 30000)
  })
  primaryKey.fill(0)
  // The observer, when the node's manager grants it: actions come on
  // stdin after the secret (from the boot program, the management
  // channel's end), results go to the log.
  if (flags.observer === 'true') {
    // The manager's state, as a shadow (step 10): lines { shadow } on stdin,
    // beside the observer's actions.
    let rest = ''
    process.stdin.on('data', chunk => {
      rest += chunk.toString()
      let i
      while ((i = rest.indexOf('\n')) !== -1) {
        const line = rest.slice(0, i); rest = rest.slice(i + 1)
        if (!line.includes('"shadow"')) continue
        try { const m = JSON.parse(line); if (m.shadow) node.shadow(m.shadow) } catch {}
      }
    })
    const { attachObserver } = await import('splectral-p2p-observer')
    attachObserver({ node, input: process.stdin, log })
  }
  let stopped = false
  const stop = async signal => {
    if (stopped) return
    stopped = true
    log({ module: 'p2p-node', kind: 'stopping', time: Date.now(), signal })
    await node.stop()
    process.exit(0)
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))
} catch (err) {
  log({ module: 'p2p-node', kind: 'failed', time: Date.now(), error: err.message, stack: String(err.stack).split('\n').slice(0, 4).join(' | ') })
  process.exit(1)
}

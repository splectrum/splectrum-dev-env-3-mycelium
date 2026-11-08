#!/usr/bin/env node
// A swarm's manager, from the command line. Prints one JSON line.
//   node cli.js genesis --swarm=<name> --folder=<swarm-folder> --nodes=<parent> --vault=<dir> --code=<dev-repo>
//   node cli.js join    --folder=<swarm-folder> --node=<name>
//   node cli.js status  --folder=<swarm-folder>
//   node cli.js restart --folder=<swarm-folder> --node=<name>
//   node cli.js start --folder=<swarm-folder>          a stopped swarm, as described
//   node cli.js stop-node --folder=<swarm-folder> --node=<name>   shut down (every party let go first), held
//   node cli.js release-node --folder=<swarm-folder> --node=<name>   held no more
//   node cli.js stop    --folder=<swarm-folder>
//   node cli.js invite  --folder=<swarm-folder>     (the invitation, for another host)
//   node cli.js deploy  --folder=<swarm-folder> --deployment=<file.json>   the swarm's part set on the swarm
//   node cli.js deployment --folder=<swarm-folder>  the swarm's deployment, as the swarm has it
//   node cli.js watch   --folder=<swarm-folder> [--auto=true]   follows it until stopped (SIGTERM):
//                       manual reports what the substrate would need; auto makes it so
//   genesis takes --deployment=<file.json> too: handed over at genesis

import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { genesis, joinNode, status, restart, stop, start, stopNode, releaseNode, invite, settled, setDeployment, readDeployment, watch } from './index.js'
import { checkDeployment } from 'p2p-node'
import { validateName } from '../mycelium-uri/index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [op] = argv.filter(a => !a.startsWith('--'))
// The boundary: a deployment file, checked once (as the master checks it).
const deploymentFile = () => flags.deployment ? checkDeployment(JSON.parse(readFileSync(flags.deployment, 'utf8')), JSON.parse(readFileSync(flags.deployment, 'utf8')).swarm) : null
const ops = {
  genesis: () => genesis({ ...flags, deployment: deploymentFile() }),
  deploy: () => setDeployment({ folder: flags.folder, deployment: deploymentFile() }),
  deployment: () => readDeployment({ folder: flags.folder }),
  async watch () {
    const w = await watch({ folder: flags.folder, auto: flags.auto === 'true' })
    const pidFile = join(flags.folder, 'watch.pid')
    writeFileSync(pidFile, String(process.pid) + '\n')
    console.log(JSON.stringify({ event: 'watching', auto: flags.auto === 'true' }))
    await new Promise(resolve => { process.on('SIGTERM', resolve); process.on('SIGINT', resolve) })
    await w.stop()
    rmSync(pidFile, { force: true })
    return { stopped: true }
  }, join: () => joinNode({ folder: flags.folder, node: flags.node }), status, restart: () => restart({ folder: flags.folder, node: flags.node }), stop, start, 'stop-node': () => stopNode({ folder: flags.folder, node: flags.node, by: 'cli' }), 'release-node': () => releaseNode({ folder: flags.folder, node: flags.node, by: 'cli' }), invite }
try {
  if (!(op in ops)) throw new Error(`unknown op: ${op}`)
  // The boundary: names from the command line, validated once.
  if (op === 'genesis') validateName(flags.swarm, 'swarm name')
  if (op === 'join' || op === 'restart' || op === 'stop-node' || op === 'release-node') validateName(flags.node, 'node name')
  const result = await ops[op](flags)
  await settled()
  console.log(JSON.stringify({ result }))
  process.exit(0)
} catch (err) {
  console.log(JSON.stringify({ error: err.message }))
  process.exit(1)
}

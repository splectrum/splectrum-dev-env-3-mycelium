// The source haicc-swarm against a stand-in for docker: the nodes found by
// their configs, each container's log followed, a new container followed too.
import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import process from 'bare-process'
import haiccSwarm, { nodesIn } from '../swarm.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

test('each node\'s container log followed, as records holding haicc-node/*', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'haicc-swarm-'))
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  // docker inspect: the id is the name's (a file says which exist); docker logs: the node's lines.
  writeFileSync(join(bin, 'docker'), `#!/bin/sh
case "$1" in
  inspect) [ -f "${dir}/exists-$4" ] || exit 1; case "$3" in *Id*) echo "id-$4" ;; *) echo 0 ;; esac ;;
  logs) echo '{"module":"p2p-node","kind":"node-started","owner":"k-'"$3"'","time":5}'; echo 'not json'; [ "$3" = id-c-master ] && echo '{"module":"p2p-rns","kind":"node-absent","uri":"/s/node-1","lastSeen":1,"leaseMs":2,"time":6}' ;;
esac
`)
  chmodSync(join(bin, 'docker'), 0o755)
  const swarm = join(dir, 's')
  for (const n of ['master', 'node-1']) {
    mkdirSync(join(swarm, n), { recursive: true })
    writeFileSync(join(swarm, n, 'node.json'), JSON.stringify({ swarm: 's', name: n, role: n === 'master' ? 'master' : 'node', container: `c-${n}` }))
  }
  mkdirSync(join(swarm, 'log'))
  writeFileSync(join(dir, 'exists-c-master'), '')
  const path = process.env.PATH
  process.env.PATH = `${bin}:${path}`
  const seen = []
  const platform = { mapRecord: (topic, record) => seen.push([topic.holds, topic.context.uri, record.value.kind]) }
  try {
    t.alike(nodesIn(swarm).map(c => c.name), ['master', 'node-1'], 'the nodes with a container')
    const s = await haiccSwarm({ kind: 'haicc-swarm', host: 'host-a', folder: swarm, scanEvery: 50 }, platform)
    await sleep(300)
    // node-1's container appears later: followed at the next scan.
    writeFileSync(join(dir, 'exists-c-node-1'), '')
    await sleep(300)
    await s.stop()
    const of = uri => seen.filter(x => x[1] === uri).map(x => `${x[0]} ${x[2]}`)
    t.alike(of('/s/master'), ['haicc-node/container following', 'haicc-node/log node-started', 'haicc-node/log node-absent', 'haicc-node/container exited'])
    t.alike(of('/s/node-1'), ['haicc-node/container following', 'haicc-node/log node-started', 'haicc-node/container exited'])
  } finally {
    process.env.PATH = path
    rmSync(dir, { recursive: true, force: true })
  }
})

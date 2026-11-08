import test from 'brittle'
import { containerArgs } from '../lib/container.js'

const config = { swarm: 'three-nodes', name: 'master', role: 'master', container: 'haicc-1a2b3c4d-three-nodes-master', network: 'haicc-1a2b3c4d-three-nodes', ip: '172.20.0.10', code: '/w/three-nodes/master/packages/base-swarm-three-nodes', labels: { 'haicc.swarm': 'three-nodes' } }

test('a node\'s container: hardened, the code mounted read-only, its key from its config', (t) => {
  const a = containerArgs(config, '/w/three-nodes/master', 'haicc-node:abc')
  const s = a.join(' ')
  for (const f of ['--read-only', '--cap-drop ALL', 'no-new-privileges', '--user 65534:65534', '--ulimit core=0', '--label haicc.swarm=three-nodes']) t.ok(s.includes(f), f)
  t.ok(s.includes('-v /w/three-nodes/master/packages/base-swarm-three-nodes:/app:ro'), 'the codebase, read-only at /app')
  t.ok(s.includes('-v /w/three-nodes/master/node.json:/node/node.json:ro'), 'its config, read-only')
  t.alike(a.slice(a.indexOf('haicc-node:abc')), ['haicc-node:abc', '/app/modules/pear-full-square/p2p-node/cli.js', 'master', '--swarm=three-nodes', '--name=master', '--host=172.20.0.10', '--storage=/data/store', '--key-file=/node/node.json', '--code=/app'])
})

test('a node that is not the master: it joins the master, by its key and DHT', (t) => {
  const a = containerArgs({ ...config, name: 'node-1', role: 'node', ip: '172.20.0.11', master: { key: 'ab'.repeat(32), dht: '172.20.0.10:49737' } }, '/w/three-nodes/node-1', 'haicc-node:abc')
  t.alike(a.slice(a.indexOf('/app/modules/pear-full-square/p2p-node/cli.js') + 1), ['join', '--swarm=three-nodes', '--name=node-1', '--host=172.20.0.11', '--storage=/data/store', '--key-file=/node/node.json', '--bootstrap=172.20.0.10:49737', `--master=${'ab'.repeat(32)}`])
})

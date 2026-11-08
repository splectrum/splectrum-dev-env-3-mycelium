// The invitation: what another host is given, public facts only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { invite } from '../index.js'
import { openTopic, folderStorage } from '../../mycelium-topic/index.js'

test('an invitation carries the swarm, its data plane, bootstrap, master and packages, and nothing of this host', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'invite-'))
  const s = {
    swarm: 'demo', image: 'p2p-node:abc1234', network: 'p2p-demo', subnet: '172.34.0', gateway: '172.34.0.1',
    aux: { network: 'p2p-demo-aux', subnet: '172.35.0.0/24', gateway: '172.35.0.1' },
    nodes: [{ name: 'master', folder: '/nodes/demo-master', managerPid: 42 }],
    vault: '/secret/vault', dht: { host: '172.34.0.2', port: 49737 }, nodesFolder: '/nodes',
    master: { uri: '/demo/master', key: 'aa'.repeat(32), packages: { uri: '/demo/master/packages', key: 'bb'.repeat(32), id: 'x', commit: 'cc'.repeat(20), files: 3 }, boot: { key: 'dd'.repeat(32) } }
  }
  const topic = await openTopic({ storage: folderStorage(join(folder, 'topics', 'swarm')) })
  await topic.produce({ value: { kind: 'described', swarm: s } })
  const inv = await invite({ folder })
  assert.deepEqual(inv, {
    swarm: 'demo',
    network: { name: 'p2p-demo', subnet: '172.34.0.0/24', gateway: '172.34.0.1' },
    bootstrap: '172.34.0.2:49737',
    master: 'aa'.repeat(32),
    packages: { uri: '/demo/master/packages', key: 'bb'.repeat(32), commit: 'cc'.repeat(20) },
    image: 'p2p-node:abc1234'
  })
  const text = JSON.stringify(inv)
  for (const notThere of ['/secret/vault', 'p2p-demo-aux', '/nodes', 'managerPid']) assert.ok(!text.includes(notThere), notThere)
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.deepEqual((await topic.consume(0)).map(r => r.value.kind), ['described', 'invited'])
  rmSync(folder, { recursive: true, force: true })
})

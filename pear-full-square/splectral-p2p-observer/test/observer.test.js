// The observer on a node: named actions in, results out; unknown refused.
import test from 'brittle'
import { PassThrough } from 'bare-stream'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import crypto from 'hypercore-crypto'
import { startNode } from 'p2p-node'
import { attachObserver } from '../index.js'

test('named actions: state and write; an unknown action refused; no secret in what it says', async (t) => {
  const primaryKey = crypto.randomBytes(32)
  const node = await startNode({ role: 'master', swarm: 'obs', name: 'master', storage: mkdtempSync(join(tmpdir(), 'obs-')), primaryKey, host: '127.0.0.1', dhtPort: 49800, code: new URL('../../p2p-rns', import.meta.url).pathname, metricsEvery: 60000 })
  const input = new PassThrough()
  const out = []
  const o = attachObserver({ node, input, log: e => out.push(e) })
  input.write(JSON.stringify({ id: 1, action: 'state' }) + '\n')
  input.write(JSON.stringify({ id: 2, action: 'write', with: { name: 'hello', text: 'Hello from a test.\n' } }) + '\n')
  input.write(JSON.stringify({ id: 3, action: 'format-disk' }) + '\n')
  await new Promise(resolve => setTimeout(resolve, 50))
  await o.settled()
  const results = out.filter(e => e.kind === 'action-result')
  t.alike(results.map(r => [r.id, r.ok]), [[1, true], [2, true], [3, false]])
  t.is(results[0].result.status.uri, '/obs/master')
  t.is(results[1].result.path, '/main/notes/hello.md')
  t.is((await node.read(node.repos.node, '/main/notes/hello.md')).toString(), 'Hello from a test.\n')
  t.ok(/unknown action/.test(results[2].error))
  t.ok(!JSON.stringify(out).includes(primaryKey.toString('hex')))
  o.detach()
  await node.stop()
})

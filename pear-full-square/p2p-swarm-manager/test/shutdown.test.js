import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { requestShutdown, release, heldNodes, letGo, endOffset, partiesOf } from '../shutdown.js'

test('a shutdown: every running party lets go first; held until released; all as records', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'shutdown-'))
  try {
    // No watcher: nobody to wait for.
    assert.deepEqual(partiesOf(folder), [])
    const a = await requestShutdown({ folder, node: 'node-1', by: 'test' })
    assert.deepEqual(a.parties, [])
    assert.deepEqual([...(await heldNodes(folder)).keys()], ['node-1'])
    await release({ folder, node: 'node-1', by: 'test' })
    assert.equal((await heldNodes(folder)).size, 0)
    assert.equal(await release({ folder, node: 'node-1' }), null, 'not held: nothing to release')

    // A watcher running (this process stands in): the request waits for it.
    writeFileSync(join(folder, 'watch.pid'), String(process.pid))
    assert.deepEqual(partiesOf(folder), ['swarm-watcher'])
    let done = false
    const asked = requestShutdown({ folder, node: 'node-2', by: 'test' }).then(r => { done = true; return r })
    await new Promise(resolve => setTimeout(resolve, 500))
    assert.equal(done, false, 'not before the watcher lets go')
    // The watcher's round: what was there at its start, let go after it.
    assert.deepEqual(await letGo(folder, 'swarm-watcher', await endOffset(folder)), ['node-2'])
    const r = await asked
    assert.deepEqual(r.parties, ['swarm-watcher'])
    assert.deepEqual(await letGo(folder, 'swarm-watcher', await endOffset(folder)), [], 'each request let go once')
    assert.ok((await heldNodes(folder)).has('node-2'))

    // A party that never lets go: the stop does not happen.
    await assert.rejects(requestShutdown({ folder, node: 'node-3', timeout: 600 }), /swarm-watcher did not let go of node-3 .*not stopped/)
  } finally { rmSync(folder, { recursive: true, force: true }) }
})

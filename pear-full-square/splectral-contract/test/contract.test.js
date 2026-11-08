import test from 'brittle'
import { checkManifest, world, contractVersion } from '../index.js'

test('a manifest is checked at the boundary', (t) => {
  const ok = { name: 'base-view-map', contract: '0.1', provides: [{ kind: 'page', id: 'map', needs: ['world'], module: 'map.js' }] }
  t.is(checkManifest(ok), ok)
  t.exception(() => checkManifest({ ...ok, contract: '2' }), /contract/)
  // Minor versions add: a 0.1 extension works on 0.2; one for 0.3 does not.
  t.is(checkManifest({ ...ok, contract: '0.2' }).contract, '0.2')
  t.exception(() => checkManifest({ ...ok, contract: '0.3' }), /contract/)
  t.exception(() => checkManifest({ ...ok, provides: [{ kind: 'page', id: 'map', module: 'm.js' }] }), /needs/)
  t.exception(() => checkManifest({ ...ok, provides: [{ kind: 'widget', id: 'x' }] }), /unknown kind/)
  t.exception(() => checkManifest({ ...ok, name: 'Bad_Name' }), /not an extension name/)
})

test('the abstract world has no p2p words', (t) => {
  const text = JSON.stringify(world).toLowerCase()
  for (const w of ['hypercore', 'dht', 'swarm', 'docker', 'container', 'corestore']) t.ok(!text.includes(w), w)
  t.is(contractVersion, '0.2.0')
  for (const e of ['absent', 'present', 'left']) t.ok(world.events[e], e)
  for (const a of ['pause-node', 'resume-node']) t.ok(world.actions.includes(a), a)
})

import test from 'brittle'
import { isName, validateName, isDataName, validateDataName, uriFormOf, dataNameOf } from '../index.js'

test('names: lowercase words joined by single hyphens', (t) => {
  for (const s of ['hosts', 'node-1', '0-probes', 'remote-1', 'a1-b2']) t.ok(isName(s), s)
  for (const s of ['', 'Node', 'a_b', '-a', 'a-', 'a--b', 'a.b', 'a b', null, 7]) t.ok(!isName(s), String(s))
  t.is(validateName('node-1'), 'node-1')
  t.exception(() => validateName('Not-Valid', 'node name'), /not a node name: Not-Valid/)
})

test('data names: lowerCamelCase, no two capitals in a row, no _', (t) => {
  for (const s of ['publicKey', 'readyMs', 'routingTable', 'dhtUrl', 'a', 'x2', 'value']) t.ok(isDataName(s), s)
  for (const s of ['PublicKey', 'dhtURL', 'ready_ms', 'ready-ms', '2x', '', '_x', null]) t.ok(!isDataName(s), String(s))
  t.exception(() => validateDataName('dhtURL'), /not a data name/)
})

test('a data name and its URI form, exact both ways', (t) => {
  for (const [d, u] of [['publicKey', 'public-key'], ['readyMs', 'ready-ms'], ['dhtUrl', 'dht-url'], ['value', 'value'], ['x2Y', 'x2-y']]) {
    t.is(uriFormOf(d), u)
    t.is(dataNameOf(u), d)
  }
  for (const s of ['Public-key', 'public_key', 'a--b', '-a', 'a-', 'a-1']) t.exception(() => dataNameOf(s), /URI form/)
})

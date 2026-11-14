import test from 'brittle'
import { relative, from, within, slashed, unslashed, segmented, joined, positionOf, ROOT } from '../index.js'

test('relative: no leading slash, . the position itself, ./ allowed in front', (t) => {
  t.is(ROOT, '.')
  t.is(relative('host'), 'host')
  t.is(relative('swarms/swarm-1/node-1'), 'swarms/swarm-1/node-1')
  t.is(relative('a/b.json'), 'a/b.json')
  for (const u of [undefined, null, '', '.', './', './.']) t.is(relative(u), '.', `${JSON.stringify(u)}: the position itself`)
  t.is(relative('./sources'), 'sources', './ in front: allowed, not part of the canonical form')
  t.is(relative('././a/b.json'), 'a/b.json')
  t.exception(() => relative('/host'), /not a relative URI: \/host \(no leading slash: host\)/, 'a leading slash: refused, the URI as it is written now said')
  t.exception(() => relative('/'), /not a relative URI: \/ \(no leading slash: \.\)/)
  t.exception(() => relative('//a'), /not a relative URI: \/\/a \(no leading slash: a\)/)
  t.exception(() => relative('Host'), /not canonical: Host \(host\)/)
  t.exception(() => relative('a//b'), /not canonical: a\/\/b \(a\/b\)/)
  t.exception(() => relative('a/'), /not canonical: a\/ \(a\)/)
  t.exception(() => relative('a_b'), /bad segment/)
  t.exception(() => relative('a/../b'), /bad segment/, 'no way up: forward only')
  t.exception(() => relative('a/./b'), /bad segment/, '. only in front')
  t.exception(() => relative(7), /not a URI/)
})

test('from, within: to and from a position', (t) => {
  t.alike([from('main', '.'), from('main', 'host'), from('.', '.'), from('.', 'runtime/hooks'), from('main/users', 'a')], ['main', 'main/host', '.', 'runtime/hooks', 'main/users/a'], 'from: written at a position')
  t.alike([within('main', 'main'), within('main', 'main/host/x'), within('.', 'main/x'), within('.', '.')], ['.', 'host/x', 'main/x', '.'], 'within: as written at the position')
  t.alike([within('main', 'runtime/x'), within('main', 'mainly'), within('main', '.'), within('main/a', 'main')], [null, null, null, null], 'not at or below it: null')
  for (const [at, u] of [['main', 'host'], ['main', '.'], ['.', 'a/b'], ['main/a', 'b/c']]) t.is(within(at, from(at, u)), u, `${at}, ${u}: there and back`)
})

test('slashed, unslashed: the slash-led paths', (t) => {
  t.alike([slashed('.'), slashed('main/host'), slashed('runtime/service.json')], ['/', '/main/host', '/runtime/service.json'])
  t.alike([unslashed('/'), unslashed('/packages/x')], ['.', 'packages/x'])
})

test('a URI as data: an array of segments, each a relative URI', (t) => {
  for (const u of [['main', 'host'], ['main', '.'], ['.'], ['main', 'swarms/swarm-1/node-1'], ['runtime/hooks']]) t.is(segmented(u), u, `${JSON.stringify(u)}: as it is`)
  t.exception(() => segmented('main/host'), /not a URI: its segments, an array/, 'one string: not the type')
  t.exception(() => segmented([]), /not a URI: its segments, an array/, 'no segment')
  t.exception(() => segmented(['main', 7]), /not a URI: a segment is a string/)
  t.exception(() => segmented(['main', '']), /not a URI: a segment is a string/)
  t.exception(() => segmented(['main', '/host']), /not a relative URI: \/host/)
  t.exception(() => segmented(['main', 'Host']), /not canonical: Host \(host\)/)
  t.exception(() => segmented(['main', './host']), /not canonical: \.\/host \(host\)/, 'a segment is in its canonical form')
  t.alike([joined(['main', 'host']), joined(['main', '.']), joined(['.']), joined(['main', 'a/b', 'c']), joined(['.', 'runtime'])], ['main/host', 'main', '.', 'main/a/b/c', 'runtime'], 'joined: the one relative URI they make')
  t.alike([positionOf(['main', '.']), positionOf(['.']), positionOf(['main', 'host'])], [['main'], [], ['main', 'host']], 'positionOf: without the segments that are .')
})

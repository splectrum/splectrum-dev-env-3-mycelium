// Positions resolved on a context written here: its files by URI.
import test from 'brittle'
import { resolve, shortcutOf, shortcutsAt, shadowOf, swarmOf, uriOf, IDENTITY, SHORTCUTS } from '../index.js'

function context (files, dir = '/work/mrepos/boot') {
  return { runtime: { dir }, read: async uri => { if (!(uri in files)) throw new Error('none'); return Buffer.from(JSON.stringify(files[uri])) } }
}

test('a position: an ordinary node, a shortcut, a URI through a shortcut', async (t) => {
  const exec = context({ 'main/host/.shortcuts.json': [{ mrepo: 'local/host' }], 'main/swarms/swarm-1/node-1/.shortcuts.json': [{ mrepo: 'swarm-1/node-1' }, { mrepo: 'swarm-2/node-9' }], 'main/empty/.shortcuts.json': [] })
  t.alike(await resolve(exec, ['main', '.']), { at: '.', shortcut: null }, 'main: the root position, where the outside stands')
  t.alike(await resolve(exec, ['.']), { at: '.', shortcut: null }, 'the mrepo itself, above its layers: no shortcut there')
  t.alike(await resolve(exec, ['main', 'swarms/swarm-1']), { at: 'swarms/swarm-1', shortcut: null }, 'an ordinary node: its position as written at main')
  t.alike(await resolve(exec, ['main', 'host']), { at: 'host', shortcut: { at: 'host', mrepo: 'local/host', folder: 'main/host', dir: '/work/mrepos/boot/main/host' } }, 'a shortcut: its entry, and the linked mrepo\'s folder in the shadow of main')
  t.is((await resolve(exec, ['main', 'swarms/swarm-1/node-1'])).shortcut.dir, '/work/mrepos/boot/main/swarms/swarm-1/node-1', 'deeper: the same path')
  await t.exception(resolve(exec, ['main', 'host/swarms']), /host is a shortcut: a URI does not run through it \(haicc host haicc swarms \.\.\.\)/)
  await t.exception(resolve(exec, ['main', 'host/']), /not canonical/)
  await t.exception(resolve(exec, 'main/host'), /not a URI: its segments, an array/, 'one string: not a form\'s URI')
  await t.exception(resolve(exec, ['/host']), /not a relative URI/)
  await t.exception(resolve(exec, ['runtime/hooks']), /not a position in main: runtime\/hooks/)
  await t.exception(resolve(exec, ['host']), /not a position in main: host/, 'from the root the layer comes first')
  t.is((await resolve({ read: exec.read }, ['main', 'host'])).shortcut.dir, null, 'no folder in the context: none')
  t.is((await resolve(exec, ['main', 'swarms/swarm-1/node-1'])).shortcut.mrepo, 'swarm-1/node-1', 'several sources at one node: the first in use')
  t.alike(await resolve(exec, ['main', 'empty']), { at: 'empty', shortcut: null }, 'a list with no source: an ordinary node')
  t.alike([await shortcutsAt(exec, 'host'), await shortcutsAt(exec, 'swarms'), (await shortcutsAt(exec, 'swarms/swarm-1/node-1')).length], [[{ mrepo: 'local/host' }], [], 2], 'shortcutsAt: the sources recorded at a position, none: []')
})

test('the paths: a shortcut\'s entry, the shadow folder, the unique URIs', (t) => {
  t.is(shortcutOf('host'), 'main/host/.shortcuts.json', 'in main, beside the node\'s document, hidden')
  t.is(SHORTCUTS, '.shortcuts.json')
  t.is(shortcutOf('swarms/swarm-1/node-1'), 'main/swarms/swarm-1/node-1/.shortcuts.json')
  t.is(shadowOf('host'), 'main/host')
  t.is(shadowOf('.'), 'main')
  t.is(IDENTITY, '/runtime/mrepo.json')
  t.is(swarmOf('local/boot'), 'local')
  t.is(swarmOf('boot'), 'local', 'no swarm: local')
  t.is(uriOf('local/boot', 'host'), 'local/host', 'what the boot mrepo creates: local/<name>')
  t.is(uriOf('swarm-1/node-1', 'x'), 'swarm-1/x')
})

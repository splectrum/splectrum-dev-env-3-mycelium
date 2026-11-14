// Positions resolved on a context written here: its files by URI.
import test from 'brittle'
import { resolve, shortcutOf, shadowOf, swarmOf, uriOf, IDENTITY } from '../index.js'

function context (files, dir = '/work/mrepos/boot') {
  return { runtime: { dir }, read: async uri => { if (!(uri in files)) throw new Error('none'); return Buffer.from(JSON.stringify(files[uri])) } }
}

test('a position: an ordinary node, a shortcut, a URI through a shortcut', async (t) => {
  const exec = context({ '/xpath/host/shortcut.json': { mrepo: 'local/host' }, '/xpath/swarms/swarm-1/node-1/shortcut.json': { mrepo: 'swarm-1/node-1' } })
  t.alike(await resolve(exec, '/'), { at: '/', shortcut: null }, 'the root')
  t.alike(await resolve(exec, '/swarms/swarm-1'), { at: '/swarms/swarm-1', shortcut: null }, 'an ordinary node')
  t.alike(await resolve(exec, '/host'), { at: '/host', shortcut: { at: '/host', mrepo: 'local/host', folder: 'main/host', dir: '/work/mrepos/boot/main/host' } }, 'a shortcut: its entry, and the linked mrepo\'s folder in the shadow of main')
  t.is((await resolve(exec, '/swarms/swarm-1/node-1')).shortcut.dir, '/work/mrepos/boot/main/swarms/swarm-1/node-1', 'deeper: the same path')
  await t.exception(resolve(exec, '/host/swarms'), /\/host is a shortcut: a URI does not run through it \(haicc \/host haicc \/swarms \.\.\.\)/)
  await t.exception(resolve(exec, '/host/'), /not canonical/)
  t.is((await resolve({ read: exec.read }, '/host')).shortcut.dir, null, 'no folder in the context: none')
})

test('the paths: a shortcut\'s entry, the shadow folder, the unique URIs', (t) => {
  t.is(shortcutOf('/host'), '/xpath/host/shortcut.json')
  t.is(shortcutOf('/swarms/swarm-1/node-1'), '/xpath/swarms/swarm-1/node-1/shortcut.json')
  t.is(shadowOf('/host'), 'main/host')
  t.is(IDENTITY, '/runtime/mrepo.json')
  t.is(swarmOf('local/boot'), 'local')
  t.is(swarmOf('boot'), 'local', 'no swarm: local')
  t.is(uriOf('local/boot', 'host'), 'local/host', 'what the boot mrepo creates: local/<name>')
  t.is(uriOf('swarm-1/node-1', 'x'), 'swarm-1/x')
})

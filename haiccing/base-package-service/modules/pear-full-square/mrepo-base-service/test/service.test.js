// The service actions on a context written here: each moves the state; the
// config says where and when each is allowed.
import test from 'brittle'
import { initialise, start, stop, shutdown, CONFIG, STATE, stateOf } from '../index.js'

function context (state) {
  const files = { [STATE]: Buffer.from(JSON.stringify({ state })) }
  return { read: async uri => { if (!files[uri]) throw new Error('none'); return files[uri] }, put: (uri, bytes) => { files[uri] = Buffer.from(bytes) } }
}

test('the actions: the state moved, booted to started and back', async (t) => {
  const exec = context('booted')
  t.alike(await initialise(exec), { service: 'initialised' })
  t.alike(await start(exec), { service: 'started' })
  t.is((await stateOf(exec)).state, 'started', 'written')
  t.alike(await stop(exec), { service: 'initialised' })
  t.alike(await shutdown(exec), { service: 'booted' })
})

test('the config: each action at /, in the states that allow it', (t) => {
  t.alike(Object.keys(CONFIG.actions), ['initialise', 'start', 'stop', 'shutdown'])
  t.alike(Object.values(CONFIG.actions).map(a => a.uris), [['/'], ['/'], ['/'], ['/']])
  t.alike(Object.fromEntries(Object.entries(CONFIG.actions).map(([n, a]) => [n, a.states])), { initialise: ['booted'], start: ['initialised'], stop: ['started'], shutdown: ['initialised'] })
  t.ok(CONFIG.description && Object.values(CONFIG.actions).every(a => a.description))
})

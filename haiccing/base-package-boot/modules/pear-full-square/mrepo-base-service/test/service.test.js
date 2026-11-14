// The service actions on a context written here: each moves the state; the
// config says where and when each is allowed.
import test from 'brittle'
import { initialise, start, stop, shutdown, CONFIG, STATE, stateOf } from '../index.js'

function context (state, hooks = {}) {
  const files = { [STATE]: Buffer.from(JSON.stringify({ state })) }
  for (const [f, command] of Object.entries(hooks)) files[`/runtime/hooks/${f}.json`] = Buffer.from(JSON.stringify(command))
  const ran = []
  return {
    ran,
    read: async uri => { if (!files[uri]) throw new Error('none'); return files[uri] },
    put: (uri, bytes) => { files[uri] = Buffer.from(bytes) },
    select: async pattern => Object.keys(files).filter(p => p.startsWith(pattern.slice(0, -1))).map(p => [p, {}]),
    run: async (command, opts) => { if (command[0] === 'fail/now') throw new Error('refused'); ran.push([command.join(' '), opts]) }
  }
}

test('the actions: the state moved, booted to started and back', async (t) => {
  const exec = context('booted')
  t.alike(await initialise(exec), { service: 'initialised', state: 'initialised' }, 'the answer: what was done, and the state now')
  t.alike(await start(exec), { service: 'started', state: 'started' })
  t.is((await stateOf(exec)).state, 'started', 'written')
  t.alike(await stop(exec), { service: 'stopped', state: 'initialised' }, 'stopped: back to initialised')
  t.alike(await shutdown(exec), { service: 'shut down', state: 'booted' }, 'shut down: back to booted')
  t.alike(exec.ran, [], 'no hooks dropped in: none run')
})

test('the hooks: each transition runs its own first, in name order, as the mrepo\'s own; one failing fails the transition', async (t) => {
  const exec = context('booted', {
    'initialise/b-extract': ['help/extract'],
    'initialise/a-ready': ['x/ready'],
    'start/activate-boot': ['protocol/activate', '.', 'boot'],
    'stop/deactivate-boot': ['protocol/deactivate', '.', 'boot'],
    'shutdown/fail': ['fail/now']
  })
  await initialise(exec)
  t.alike(exec.ran, [['x/ready', { own: true }], ['help/extract', { own: true }]], 'initialise: its hooks, by name, each run in its execution as the mrepo\'s own')
  await start(exec)
  t.alike(exec.ran.at(-1), ['protocol/activate . boot', { own: true }], 'start: the door opened by its hook')
  await stop(exec)
  t.alike(exec.ran.at(-1), ['protocol/deactivate . boot', { own: true }], 'stop: closed again')
  await t.exception(shutdown(exec), /refused/, 'a hook that fails: the transition fails')
  t.is((await stateOf(exec)).state, 'initialised', 'the state not moved')
})

test('the config: each action at the mrepo itself, in the states that allow it', (t) => {
  t.alike(Object.keys(CONFIG.actions), ['initialise', 'start', 'stop', 'shutdown'])
  t.alike(Object.values(CONFIG.actions).map(a => a.uris), [['.'], ['.'], ['.'], ['.']])
  t.alike(Object.fromEntries(Object.entries(CONFIG.actions).map(([n, a]) => [n, a.states])), { initialise: ['booted'], start: ['initialised'], stop: ['started'], shutdown: ['initialised'] })
  t.ok(CONFIG.description && Object.values(CONFIG.actions).every(a => a.description))
})

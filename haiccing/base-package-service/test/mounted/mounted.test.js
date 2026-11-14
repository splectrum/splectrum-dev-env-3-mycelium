// The package's protocol as it is mounted: its protocol.js, what a runtime
// loads, its config value by value and in effect (the request check, on
// each state), what its structure brings (the state it starts in, its list
// of packages, its hooks, file by file), and each action run on a minimal
// execution, in memory, over the package's own state file and hooks. No
// mrepo is built. Every action the config names must be run here, and
// every hook file the package brings must be named here: the last tests
// fail when one was left out.
import test from '../../modules/node_modules/brittle/index.js'
import { readFileSync, readdirSync, existsSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import { check } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import * as mounted from '../../protocol.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const json = (...p) => JSON.parse(readFileSync(join(pkg, ...p), 'utf8'))
const ran = new Set()
const act = (name, exec) => { ran.add(name); return mounted.actions.service[name](exec, { uri: '/' }) }

// The hooks the package brings, as they are in its structure: by
// <transition>/<name>, each its command.
const hooksDir = join(pkg, 'mrepo', 'runtime', 'hooks')
const brought = {}
for (const t of existsSync(hooksDir) ? readdirSync(hooksDir).sort() : []) for (const f of readdirSync(join(hooksDir, t)).sort()) brought[`${t}/${f.slice(0, -5)}`] = json('mrepo', 'runtime', 'hooks', t, f)

// An execution as an action sees it: the runtime layer's files by URI (the
// state, the hooks), the commands it is asked to run kept in order.
function execution (state, hooks = brought, { failing = null } = {}) {
  const files = { '/runtime/service.json': Buffer.from(JSON.stringify({ state })) }
  for (const [name, command] of Object.entries(hooks)) files[`/runtime/hooks/${name}.json`] = Buffer.from(JSON.stringify(command))
  const commands = []
  const writes = []
  const exec = {
    read: async uri => { if (!(uri in files)) throw new Error(`nothing at ${uri}`); return files[uri] },
    select: async pattern => Object.keys(files).filter(p => p.startsWith(pattern.slice(0, -1))).map(p => [p, {}]),
    put: (uri, bytes) => { writes.push(uri); files[uri] = Buffer.from(bytes) },
    run: async (command, opts) => { if (command[0] === failing) throw new Error(`${failing}: refused`); commands.push([command.join(' '), opts]) },
    log: () => {}
  }
  const now = () => JSON.parse(files['/runtime/service.json'].toString()).state
  return { exec, commands, writes, now }
}

test('what it provides: one protocol, service, its config and its actions', (t) => {
  t.alike(Object.keys(mounted.protocols), ['service'], 'the package provides the service protocol, and no other')
  t.alike(Object.keys(mounted.actions), ['service'])
  t.alike(Object.keys(mounted.actions.service).sort(), Object.keys(mounted.protocols.service.actions).sort(), 'a function for every action configured, and no other')
})

test('its config, value by value: each action at the mrepo itself, in the states that allow it', (t) => {
  const cfg = mounted.protocols.service
  t.is(cfg.package, 'haiccing/base-package-service', 'the package that brings it')
  t.ok(cfg.description, 'its description')
  t.alike(Object.keys(cfg).sort(), ['actions', 'description', 'package'], 'nothing else: no default action')
  t.alike(Object.fromEntries(Object.entries(cfg.actions).map(([n, a]) => [n, a.states])), { initialise: ['booted'], start: ['initialised'], stop: ['started'], shutdown: ['initialised'] }, 'the state machine: booted, initialised, started, and back')
  for (const [name, a] of Object.entries(cfg.actions)) {
    t.alike(a.uris, ['/'], `${name}: at the mrepo itself, nowhere else`)
    t.ok(a.description, `${name}: its description`)
    t.alike(Object.keys(a).sort(), ['description', 'states', 'uris'], `${name}: nothing else: no argument, no target`)
  }
})

test('its config in effect: a request checked on each state, allowed only where the action names it', (t) => {
  const protocols = mounted.protocols
  const active = { service: protocols.service }
  const allowed = { booted: ['initialise'], initialised: ['shutdown', 'start'], started: ['stop'] }
  for (const [state, can] of Object.entries(allowed)) {
    const now = Object.keys(protocols.service.actions).filter(action => check({ protocol: 'service', action, uri: '/' }, { service: { state }, protocols, active }) === null).sort()
    t.alike(now, can, `${state}: ${can.join(', ')} allowed, the others refused`)
  }
  t.is(check({ protocol: 'service', action: 'start', uri: '/' }, { service: { state: 'booted' }, protocols, active }), 'not now: service start (the service is booted)', 'a refusal says the state the service is in')
  t.is(check({ protocol: 'service', action: 'start', uri: '/host' }, { service: { state: 'initialised' }, protocols, active }), 'not offered: service start at /host', 'anywhere but the mrepo itself: not offered')
  t.is(check({ protocol: 'service', action: 'start', uri: '/' }, { service: { state: 'initialised' }, protocols, active: {} }), 'not now: service start (service is not active; the service is initialised)', 'not activated: refused whatever the state')
})

test('its structure: the state it starts in, and its list of packages', (t) => {
  t.alike(json('mrepo', 'runtime', 'service.json'), { state: 'booted' }, 'an mrepo that links it starts booted')
  const list = json('mrepo', 'packages', 'layer.json').packages
  t.alike(list, ['haiccing/base-package-runtime', 'haiccing/base-package-help', 'haiccing/base-package-protocol', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template', 'haiccing/base-package-service'], 'deployed alone: the runtime, help, the protocol protocol, the documentation, itself last')
})

// The hooks it brings, each named here with its command: deployed alone,
// what the mrepo offers from its boot, and what its initialise does.
const HOOKS = {
  'boot/activate-help': ['protocol/activate', '/', 'help'],
  'boot/activate-runtime': ['protocol/activate', '/', 'runtime'],
  'boot/activate-service': ['protocol/activate', '/', 'service'],
  'initialise/help-extract': ['help/extract']
}

test('its hooks, file by file: at boot help, runtime and service activated; on initialise the help extracted', (t) => {
  t.alike(brought, HOOKS, 'each hook file, its transition and its command; none that is not named here')
  t.absent(Object.keys(brought).some(n => /^(start|stop|shutdown)\//.test(n)), 'none on start, stop or shutdown: deployed alone it has no door to open')
})

test('initialise: its hook run first, as the mrepo\'s own, then the state moved', async (t) => {
  const { exec, commands, writes, now } = execution('booted')
  t.alike(await act('initialise', exec), { service: 'initialised', state: 'initialised' }, 'what it returns: what was done, the state now')
  t.alike(commands, [['help/extract', { own: true }]], 'the package\'s own initialise hook, run in the execution as the mrepo\'s own; the boot hooks are not its to run')
  t.alike([now(), writes], ['initialised', ['/runtime/service.json']], 'one write: the state')
})

test('start, stop, shutdown: the state moved each time, no hook of its own to run', async (t) => {
  const { exec, commands, now } = execution('initialised')
  t.alike(await act('start', exec), { service: 'started', state: 'started' })
  t.alike(await act('stop', exec), { service: 'stopped', state: 'initialised' }, 'stopped: back to initialised')
  t.alike(await act('shutdown', exec), { service: 'shut down', state: 'booted' }, 'shut down: back to booted')
  t.alike([now(), commands], ['booted', []])
})

test('hooks dropped in by a package that defines the mrepo: each transition its own, in name order; one failing, the state not moved', async (t) => {
  const dropped = { 'start/b-open': ['protocol/activate', '/', 'boot'], 'start/a-first': ['x/first'], 'stop/close': ['protocol/deactivate', '/', 'boot'], 'shutdown/last': ['x/last'] }
  const { exec, commands, now } = execution('initialised', dropped)
  await act('start', exec)
  t.alike(commands, [['x/first', { own: true }], ['protocol/activate / boot', { own: true }]], 'start: its hooks only, by name')
  await act('stop', exec)
  t.alike(commands.at(-1), ['protocol/deactivate / boot', { own: true }], 'stop: its own')
  const bad = execution('initialised', dropped, { failing: 'x/last' })
  await t.exception(act('shutdown', bad.exec), /x\/last: refused/, 'a hook that fails: the transition fails')
  t.alike([bad.now(), bad.writes], ['initialised', []], 'the state not moved, nothing written')
  t.is(now(), 'initialised')
})

test('every action the config names was run here', (t) => {
  t.alike([...ran].sort(), Object.keys(mounted.protocols.service.actions).sort(), 'none left out: an action added without its test fails this')
})

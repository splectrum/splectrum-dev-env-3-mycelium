import test from 'brittle'
import { check, matches, missing, hooks, record, wrap, guid, complete, isComplete, interpret, formOf, relative, from, within, slashed, unslashed, segmented, joined, ROOT, MAIN, OUTSIDE, OWN } from '../index.js'

// The protocols as a runtime loaded them: each action's URIs (patterns
// written at main, where the outside stands), and the states that allow it
// where it names them (the service's own).
const at1 = states => ({ uris: ['.'], states })
const protocols = {
  service: { actions: { initialise: at1(['booted']), start: at1(['initialised']), stop: at1(['started']), shutdown: at1(['initialised']) } },
  rest: { actions: { get: { uris: ['**'] }, put: { uris: ['<name>/**'] }, delete: { uris: ['<name>/**'] } } },
  help: { actions: { get: { uris: ['.'] } } }
}
// the active ones: service and help always; rest once the service is started
// (as hooks on boot, start and stop would have it)
const activeAt = state => Object.fromEntries(['service', 'help', ...(state === 'started' ? ['rest'] : [])].map(n => [n, protocols[n]]))
const at = state => ({ service: { state }, protocols, active: activeAt(state) })
// its fourth: a document, the rest put's argument (JSON text)
// (a form as the mrepo holds it: its URI given here from the root, as one
// string, made its segments: the prefix main, then the rest)
const seg = u => (Array.isArray(u) ? u : u === 'main' ? ['main', '.'] : u.startsWith('main/') ? ['main', u.slice(5)] : [u])
const req = (protocol, action, uri, doc) => ({ protocol, action, uri: seg(uri), ...(doc !== undefined ? { args: [JSON.stringify(doc)] } : {}) })

test('a URI in a request: where its writer stands; inside, an array of segments', (t) => {
  t.alike([ROOT, MAIN, OUTSIDE, OWN], ['.', 'main', ['main'], []], 'from outside the prefix main; the mrepo\'s own: none')
  t.alike([segmented(['main', 'host']), joined(['main', 'host']), joined(['main', '.']), joined(['.'])], [['main', 'host'], 'main/host', 'main', '.'], 'the URI functions, mycelium-uri\'s, offered here too')
  t.alike([from(MAIN, relative('host')), within(MAIN, 'main/host'), slashed('main/host'), unslashed('/packages')], ['main/host', 'host', '/main/host', 'packages'])
})

test('a command interpreted: its parts, the default action, the URI its segments', (t) => {
  t.alike(interpret(['boot/deploy', 'host', 'haiccing/base-component-haicc'], {}, OUTSIDE), { protocol: 'boot', action: 'deploy', uri: ['main', 'host'], args: ['haiccing/base-component-haicc'] }, 'an array of parts; written from outside: the prefix main, then the URI as it is, two segments')
  t.alike(interpret('help/get . packages oneliner', {}, OUTSIDE), { protocol: 'help', action: 'get', uri: ['main', '.'], args: ['packages', 'oneliner'] }, 'a string, split at its spaces; . is the position itself')
  t.alike(interpret(['service/initialise'], {}, OUTSIDE), { protocol: 'service', action: 'initialise', uri: ['main', '.'], args: [] }, 'no URI: the position itself')
  t.alike(interpret(['boot/deploy', 'swarms/swarm-1/node-1', 'x'], {}, OUTSIDE).uri, ['main', 'swarms/swarm-1/node-1'], 'a URI of several name parts: one segment, whole')
  t.alike(interpret(['protocol/activate', '.', 'help']), { protocol: 'protocol', action: 'activate', uri: ['.'], args: ['help'] }, 'the mrepo\'s own: no prefix, one segment')
  t.alike(interpret(['boot/deploy', 'main/host', 'x']), { protocol: 'boot', action: 'deploy', uri: ['main/host'], args: ['x'] }, 'its own commands name the layer first, in the one segment')
  t.alike(interpret(['boot/deploy', './host', 'x'], {}, OUTSIDE).uri, ['main', 'host'], './host is host')
  t.alike(interpret(['haicc', 'host', 'service/start'], { haicc: { default: 'goto' } }, OUTSIDE), { protocol: 'haicc', action: 'goto', uri: ['main', 'host'], args: ['service/start'] }, 'the protocol alone: its default action; what follows, its arguments')
  t.exception(() => interpret(['boot/deploy', '/host', 'x'], {}, OUTSIDE), /not a relative URI: \/host/)
  t.exception(() => interpret(['service']), /no action: service \(service has no default action\)/)
  t.exception(() => interpret([]), /not a command/)
  t.exception(() => interpret(['a/b/c']), /not a command: a\/b\/c/)
  t.exception(() => interpret(['boot/deploy', 7]), /not a command/)
  t.alike(formOf('service/start', {}, OUTSIDE), { command: 'service/start', protocol: 'service', action: 'start', uri: ['main', '.'], args: [] }, 'a value given as a command: the form filled in, the command kept')
  t.alike(formOf({ command: ['service/start'] }), { command: ['service/start'], protocol: 'service', action: 'start', uri: ['.'], args: [] }, 'the mrepo\'s own by default')
  t.alike(formOf({ protocol: 'service', action: 'start', uri: '.' }, {}, OUTSIDE), { protocol: 'service', action: 'start', uri: ['main', '.'] }, 'a form given filled in: its URI, one segment as written, taken where its writer stands, the same')
  t.alike(formOf({ protocol: 'boot', action: 'deploy', uri: 'host', args: ['x'] }, {}, OUTSIDE).uri, ['main', 'host'])
  t.alike(formOf({ protocol: 'service', action: 'start' }, {}, OUTSIDE).uri, ['main', '.'], 'no URI: the position itself')
  t.exception(() => formOf({ protocol: 'service', action: 'start', uri: '/' }, {}, OUTSIDE), /not a relative URI/)
  t.exception(() => formOf({ protocol: 'service', action: 'start', uri: ['main', '.'] }, {}, OUTSIDE), /not a URI: one segment, as it is written/, 'from outside a URI is one segment, never the array')
  t.is(formOf(7), 7, 'not a request: left as it is, for the check to say')
})

test('missing: what an action\'s config asks for and the request does not give', (t) => {
  const deploy = { uris: ['<name>'], target: true, args: ['package'] }
  const redeploy = { uris: ['<name>'], target: true, args: ['package?'] }
  t.is(missing(deploy, ['main', 'host'], ['haiccing/x']), null, 'all given')
  t.is(missing(deploy, ['main', '.'], ['haiccing/x']), 'missing argument: target', 'a target needed: . as it was written is the position itself, the mrepo')
  t.is(missing(deploy, ['.'], ['haiccing/x']), 'missing argument: target', 'the mrepo\'s own: the same')
  t.is(missing(deploy, ['main/host'], ['haiccing/x']), null, 'its own, the layer first in its one segment: a target')
  t.is(missing(deploy, ['main', 'host'], []), 'missing argument: package', 'an argument, by its name')
  t.is(missing(deploy, ['main', '.'], []), 'missing argument: target', 'the target first')
  t.is(missing(redeploy, ['main', 'host'], []), null, 'one ending in ?: optional')
  t.is(missing({ uris: ['**'] }, ['main', '.'], []), null, 'no target asked for: the position itself will do')
  t.is(missing(undefined, ['main', '.'], []), null, 'no config: nothing asked')
  const p = { boot: { actions: { deploy } } }
  const open = { service: null, protocols: p, active: p }
  t.is(check({ protocol: 'boot', action: 'deploy', uri: ['main', '.'] }, open), 'missing argument: target', 'said before the URI is said not offered')
  t.is(check({ protocol: 'boot', action: 'deploy', uri: ['main', '.'] }, { ...open, active: {} }), 'missing argument: target', 'and before the protocol is said not active')
  t.is(check({ protocol: 'boot', action: 'deploy', uri: ['main', 'host'] }, open), 'missing argument: package')
  t.is(check({ protocol: 'boot', action: 'deploy', uri: ['main', 'host'], args: ['x'] }, open), null)
  t.is(check({ protocol: 'boot', action: 'deploy', uri: ['.'] }, open, { internal: true }), 'missing argument: target', 'the mrepo\'s own too: written at its root')
  t.is(check({ protocol: 'boot', action: 'deploy', uri: ['main/host'], args: ['x'] }, open, { internal: true }), null, 'its own: the layer first')
})

test('matches: a URI against a config\'s pattern', (t) => {
  t.ok(matches('.', '.') && !matches('.', 'a'))
  t.ok(matches('<name>', 'host') && !matches('<name>', '.') && !matches('<name>', 'a/b'))
  t.ok(matches('swarms/**', 'swarms') && matches('swarms/**', 'swarms/a/b.json') && !matches('swarms/**', 'nodes/x'))
  t.ok(matches('**', '.') && matches('**', 'anything/at/all'))
  t.ok(matches('<name>/**', 'a') && matches('<name>/**', 'a/b') && !matches('<name>/**', '.'), 'anything below, not the position itself')
})

test('check: canonical, loaded, offered there', (t) => {
  t.is(check(req('rest', 'get', 'main'), at('started')), null)
  t.is(check(req('rest', 'put', 'main/a/b.json', 1), at('started')), null, 'deep')
  t.is(check(req('rest', 'get', 'main/Main'), at('started')), 'not canonical: Main (main)')
  t.is(check({ protocol: 'rest', action: 'get', uri: 'main/a' }, at('started')), 'not a URI: its segments, an array', 'a form\'s URI is its segments, never one string')
  t.is(check({ protocol: 'rest', action: 'get', uri: ['main', 'a', 'b'] }, at('started')), 'not offered: rest get at main/a/b', 'more segments than the prefix and the URI: nothing offered there yet')
  t.is(check(req('rest', 'get', ['main', '/a']), at('started')), 'not a relative URI: /a (no leading slash: a)', 'a leading slash: refused')
  t.ok(check(req('rest', 'get', 'main/a_b'), at('started')), 'a bad URI: refused')
  t.is(check(req('rest', 'put', 'main', 1), at('started')), 'not offered: rest put at .')
  t.is(check(req('rest', 'get', 'packages'), at('started')), 'not offered: rest get at packages', 'not in main: nothing outside it is offered')
  t.is(check(req('rest', 'get', '.'), at('started')), 'not offered: rest get at .', 'the root neither')
  t.is(check(req('rest', 'post', 'main/x.json', 1), at('started')), 'no action: rest post (delete, get, put)', 'an action that is not there: said with those that are')
  t.is(check(req('other', 'get', 'main'), at('started')), 'no protocol: other (help, rest, service)', 'a protocol that is not loaded: said with the active ones')
  t.is(check(null, at('started')), 'not a request')
})

test('check: nothing is active by default; a request from outside only for an active protocol', (t) => {
  t.is(check(req('rest', 'get', 'main'), { service: null, protocols, active: {} }), 'not now: rest get (rest is not active)', 'loaded, not active: not from outside; no service')
  t.is(check(req('rest', 'get', 'main'), { service: null, protocols }), 'not now: rest get (rest is not active)', 'no protocols layer at all: nothing active')
  t.is(check(req('rest', 'get', 'main'), { service: null, protocols, active: { rest: protocols.rest } }), null, 'activated (a boot hook): accepted, without any service')
  t.is(check(req('help', 'get', 'main'), at('booted')), null, 'active from boot: open whatever the service\'s state')
  t.is(check(req('help', 'get', 'main'), at('started')), null)
  t.is(check(req('rest', 'get', 'main'), at('booted')), 'not now: rest get (rest is not active; the service is booted)', 'behind the service\'s door: activated by its start')
  t.is(check(req('rest', 'get', 'main'), at('initialised')), 'not now: rest get (rest is not active; the service is initialised)')
  t.is(check(req('rest', 'get', 'main'), at('started')), null, 'started: active')
})

test('check: the service\'s own actions, each in its state', (t) => {
  t.is(check(req('service', 'initialise', 'main'), at('booted')), null)
  t.is(check(req('service', 'start', 'main'), at('booted')), 'not now: service start (the service is booted)')
  t.is(check(req('service', 'start', 'main'), at('initialised')), null)
  t.is(check(req('service', 'shutdown', 'main'), at('initialised')), null)
  t.is(check(req('service', 'stop', 'main'), at('started')), null)
  t.is(check(req('service', 'shutdown', 'main'), at('started')), 'not now: service shutdown (the service is started)')
  t.is(check(req('service', 'start', 'main/host'), at('initialised')), 'not offered: service start at host')
})

test('check at the inbox: neither the activation nor the state (the queue may change them first)', (t) => {
  const inbox = { state: false }
  t.is(check(req('service', 'start', 'main'), at('booted'), inbox), null, 'start behind a queued initialise')
  t.is(check(req('rest', 'put', 'main/x.json', 1), at('booted'), inbox), null, 'loaded and offered there; not active yet: not checked until it executes')
  t.is(check(req('rest', 'put', 'main', 1), at('initialised'), inbox), 'not offered: rest put at .', 'not offered there: refused at once')
  t.is(check(req('service', 'fly', 'main'), at('booted'), inbox), 'no action: service fly (initialise, shutdown, start, stop)')
  t.is(check(req('other', 'get', 'main'), at('booted'), inbox), 'no protocol: other (help, service)', 'not loaded: refused at once')
})

test('hooks: the commands of a transition, files in its folder, in name order', async (t) => {
  const files = {
    '/runtime/hooks/boot/b-help.json': ['help/extract'],
    '/runtime/hooks/boot/a-activate.json': ['protocol/activate', '.', 'help'],
    '/runtime/hooks/boot/notes.txt': 'x',
    '/runtime/hooks/start/activate-boot.json': ['protocol/activate', '.', 'boot']
  }
  const reader = {
    select: async pattern => Object.keys(files).filter(p => p.startsWith(pattern.slice(0, -1))).map(p => [p, {}]),
    read: async p => Buffer.from(JSON.stringify(files[p]))
  }
  t.alike(await hooks(reader, 'boot'), [{ name: 'a-activate', command: ['protocol/activate', '.', 'help'] }, { name: 'b-help', command: ['help/extract'] }], 'each file a command, its parts; by name')
  t.alike(await hooks(reader, 'stop'), [], 'none dropped in: none')
  t.alike(await hooks({ select: async () => { throw new Error('no layer') }, read: reader.read }, 'boot'), [], 'no runtime layer: none')
  await t.exception(hooks(reader, 'reboot'), /not a transition: reboot \(boot, initialise, start, stop, shutdown\)/)
  files['/runtime/hooks/stop/bad.json'] = { command: 'x' }
  await t.exception(hooks(reader, 'stop'), /not a hook: \/runtime\/hooks\/stop\/bad.json/)
})

test('a record: topic, key, timestamp, headers (empty), value; the onion; a form completed', (t) => {
  const core = record('/haicc/terminal', { api: 'haicc', protocol: 'rest', action: 'get', uri: ['main', '.'] }, guid())
  const envelope = wrap('/host/inbox', core)
  t.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(core.key), 'the key: a GUID')
  t.is(envelope.key, core.key, 'the envelope carries its core\'s key')
  t.alike(Object.keys(envelope), ['topic', 'key', 'timestamp', 'headers', 'value'])
  t.alike(envelope.headers, {})
  t.is(envelope.value, core, 'the core inside')
  t.absent(isComplete(core))
  const done = complete(core, { ok: true, value: { a: 1 } })
  t.ok(isComplete(done))
  t.alike(done.value, { ...core.value, output: { a: 1 } }, 'the request and its output')
  t.is(done.topic, '/haicc/terminal', 'still addressed to its sender')
  t.alike(core.value.output, undefined, 'the core itself not changed')
  t.alike(complete(core, { ok: false, error: 'x' }).value.error, 'x')
})

test('check: an internal request, the mrepo\'s own: not asked whether active; an action that names its states still by them', (t) => {
  const extract = { protocol: 'help', action: 'extract', uri: ['.'] }
  t.is(check(extract, at('initialised'), { internal: true }), null, 'an action its config does not even name: allowed, the mrepo\'s own')
  t.is(check(req('rest', 'get', 'runtime/service.json'), at('booted'), { internal: true }), null, 'a protocol that is not active, a URI outside main: allowed')
  t.is(check(extract, { service: null, protocols: null }, { internal: true }), null, 'without service too')
  t.ok(/not canonical/.test(check({ ...extract, uri: ['A'] }, at('started'), { internal: true })), 'its URI still checked')
  t.is(check(extract, at('initialised')), 'no action: help extract (get)', 'not internal: asked')
  t.is(check(req('service', 'initialise', '.'), at('initialised'), { internal: true }), 'not now: service initialise (the service is initialised)', 'a service action: its states, internal or not')
  t.is(check(req('service', 'start', '.'), at('initialised'), { internal: true }), null, 'and allowed when its state allows')
})

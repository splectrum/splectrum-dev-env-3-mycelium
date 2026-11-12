import test from 'brittle'
import { check, matches, record, wrap, guid, complete, isComplete } from '../index.js'

// The protocols as a runtime loaded them: each action's URIs, and the
// states that allow it where it names them (the service's own).
const at1 = states => ({ uris: ['/'], states })
const protocols = {
  service: { actions: { initialise: at1(['booted']), start: at1(['initialised']), stop: at1(['started']), shutdown: at1(['initialised']) } },
  rest: { gated: true, actions: { get: { uris: ['/', '/main/**'] }, put: { uris: ['/main/**'] }, delete: { uris: ['/main/**'] } } },
  help: { actions: { get: { uris: ['/**'] } } }
}
const at = state => ({ service: { state }, protocols })
const req = (protocol, action, uri, body) => ({ protocol, action, uri, ...(body !== undefined ? { body } : {}) })

test('matches: a URI against a config\'s pattern', (t) => {
  t.ok(matches('/', '/') && !matches('/', '/a'))
  t.ok(matches('/<name>', '/host') && !matches('/<name>', '/') && !matches('/<name>', '/a/b'))
  t.ok(matches('/main/**', '/main') && matches('/main/**', '/main/a/b.json') && !matches('/main/**', '/runtime/x'))
  t.ok(matches('/**', '/') && matches('/**', '/anything/at/all'))
})

test('check: canonical, offered, and now', (t) => {
  t.is(check(req('rest', 'get', '/'), at('started')), null)
  t.is(check(req('rest', 'put', '/main/a/b.json', 1), at('started')), null, 'deep')
  t.is(check(req('rest', 'get', '/Main'), at('started')), 'not canonical: /Main (/main)')
  t.ok(check(req('rest', 'get', '/a_b'), at('started')), 'a bad URI: refused')
  t.is(check(req('rest', 'put', '/', 1), at('started')), 'not offered: rest put at /')
  t.is(check(req('rest', 'get', '/packages'), at('started')), 'not offered: rest get at /packages')
  t.is(check(req('rest', 'post', '/main/x.json', 1), at('started')), 'not offered: rest post')
  t.is(check(req('other', 'get', '/'), at('started')), 'not offered: other')
  t.is(check(null, at('started')), 'not a request')
  t.is(check(req('other', 'get', '/'), { service: null, protocols }), null, 'without service: no gate')
})

test('check: the service\'s door: closed for the protocols behind it, not for the others', (t) => {
  t.is(check(req('help', 'get', '/main'), at('booted')), null, 'not gated: open whatever the state')
  t.is(check(req('help', 'get', '/main'), at('started')), null)
  t.is(check(req('service', 'initialise', '/'), at('booted')), null)
  t.is(check(req('service', 'start', '/'), at('booted')), 'not now: service start (the service is booted)')
  t.is(check(req('rest', 'get', '/'), at('booted')), 'not now: rest get (the service is booted, not started)')
  t.is(check(req('service', 'start', '/'), at('initialised')), null)
  t.is(check(req('service', 'shutdown', '/'), at('initialised')), null)
  t.is(check(req('rest', 'get', '/'), at('initialised')), 'not now: rest get (the service is initialised, not started)')
  t.is(check(req('service', 'stop', '/'), at('started')), null)
  t.is(check(req('service', 'shutdown', '/'), at('started')), 'not now: service shutdown (the service is started)')
  t.is(check(req('service', 'start', '/main'), at('initialised')), 'not offered: service start at /main')
})

test('check at the inbox: not the state (the queue may change it first)', (t) => {
  const inbox = { state: false }
  t.is(check(req('service', 'start', '/'), at('booted'), inbox), null, 'start behind a queued initialise')
  t.is(check(req('rest', 'put', '/main/x.json', 1), at('booted'), inbox), null, 'offered; the state not checked yet')
  t.is(check(req('rest', 'put', '/', 1), at('initialised'), inbox), 'not offered: rest put at /', 'not offered: refused at once')
  t.is(check(req('service', 'fly', '/'), at('booted'), inbox), 'not offered: service fly')
})

test('a record: topic, key, timestamp, headers (empty), value; the onion; a form completed', (t) => {
  const core = record('/haicc/terminal', { api: 'haicc', protocol: 'rest', action: 'get', uri: '/' }, guid())
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

test('check: an internal request, the mrepo\'s own: not asked whether offered, not waiting for started; an action that names its states still by them', (t) => {
  const extract = { protocol: 'help', action: 'extract', uri: '/' }
  t.is(check(extract, at('initialised'), { internal: true }), null, 'before it is started, not offered: allowed')
  t.is(check(extract, { service: null, protocols: null }, { internal: true }), null, 'without service too')
  t.ok(/not canonical/.test(check({ ...extract, uri: '/A' }, at('started'), { internal: true })), 'its URI still checked')
  t.is(check(extract, at('initialised')), 'not offered: help extract', 'not internal: asked whether offered')
  t.is(check(req('service', 'initialise', '/'), at('initialised'), { internal: true }), 'not now: service initialise (the service is initialised)', 'a service action: its states, internal or not')
  t.is(check(req('service', 'start', '/'), at('initialised'), { internal: true }), null, 'and allowed when its state allows')
})

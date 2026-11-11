import test from 'brittle'
import { check, record, wrap, guid, complete, isComplete } from '../index.js'

const api = {
  api: 'haicc',
  types: [
    { uri: '/', protocols: { service: ['initialise', 'start', 'stop', 'shutdown'], rest: ['get'] } },
    { uri: '/main', deep: true, protocols: { rest: ['get', 'put', 'delete'] } }
  ]
}
const at = state => ({ service: { state, type: 'haicc' }, api: state === 'booted' ? null : api })
const req = (protocol, action, uri, body) => ({ api: 'haicc', protocol, action, uri, ...(body !== undefined ? { body } : {}) })

test('check: not misdelivered, canonical, offered, and now', (t) => {
  t.is(check(req('rest', 'get', '/'), at('started')), null)
  t.is(check(req('rest', 'put', '/main/a/b.json', 1), at('started')), null, 'deep')
  t.is(check({ ...req('rest', 'get', '/'), api: 'other' }, at('started')), 'misdelivered: api other, this repository is of type haicc')
  t.is(check(req('rest', 'get', '/Main'), at('started')), 'not canonical: /Main (/main)')
  t.ok(check(req('rest', 'get', '/a_b'), at('started')), 'a bad URI: refused')
  t.is(check(req('rest', 'put', '/', 1), at('started')), 'not offered: rest put at /')
  t.is(check(req('rest', 'get', '/packages'), at('started')), 'no such resource: /packages')
  t.is(check(req('rest', 'put', '/main/x.json'), at('started')), 'put needs a body')
  t.is(check(null, at('started')), 'not a request')
})

test('check: the service state gates the API', (t) => {
  t.is(check(req('service', 'initialise', '/'), at('booted')), null)
  t.is(check(req('service', 'start', '/'), at('booted')), 'not now: service start (the service is booted)')
  t.is(check(req('rest', 'get', '/'), at('booted')), 'not now: rest get (the service is booted, not started)')
  t.is(check(req('service', 'start', '/'), at('initialised')), null)
  t.is(check(req('service', 'shutdown', '/'), at('initialised')), null)
  t.is(check(req('rest', 'get', '/'), at('initialised')), 'not now: rest get (the service is initialised, not started)')
  t.is(check(req('service', 'stop', '/'), at('started')), null)
  t.is(check(req('service', 'shutdown', '/'), at('started')), 'not now: service shutdown (the service is started)')
  t.is(check(req('service', 'start', '/main'), at('initialised')), 'no service at /main')
})

test('check at the inbox: not the state (the queue may change it first)', (t) => {
  const inbox = { state: false }
  t.is(check(req('service', 'start', '/'), at('booted'), inbox), null, 'start behind a queued initialise')
  t.is(check(req('rest', 'put', '/main/x.json', 1), at('booted'), inbox), null, 'no API yet: offered checked as it executes')
  t.is(check(req('rest', 'put', '/', 1), at('initialised'), inbox), 'not offered: rest put at /', 'the API, once there: checked')
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

test('check: an internal request, the mrepo\'s own: no API, not waiting for started; the service\'s actions still by its state', (t) => {
  const extract = { protocol: 'help', action: 'extract', uri: '/' }
  t.is(check(extract, at('initialised'), { internal: true }), null, 'before it is started, not offered: allowed')
  t.is(check(extract, { service: null, api: null }, { internal: true }), null, 'without service too')
  t.ok(/not canonical/.test(check({ ...extract, uri: '/A' }, at('started'), { internal: true })), 'its URI still checked')
  t.ok(check(extract, at('initialised')), 'not internal: the gates apply')
  t.ok(/not now: service initialise/.test(check({ protocol: 'service', action: 'initialise', uri: '/' }, at('initialised'), { internal: true })), 'a service action: its state machine, internal or not')
  t.is(check({ protocol: 'service', action: 'start', uri: '/' }, at('initialised'), { internal: true }), null, 'and allowed when its state allows')
})

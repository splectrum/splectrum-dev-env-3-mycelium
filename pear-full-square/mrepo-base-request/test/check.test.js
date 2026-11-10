import test from 'brittle'
import { check, record, moved, withHeader } from '../index.js'

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

test('a record: topic, timestamp, headers, value; moved, a header added', (t) => {
  const r = record('/inbox', { a: 1 }, { mrepo: { from: null } })
  t.alike(Object.keys(r), ['topic', 'timestamp', 'headers', 'value'])
  t.is(moved(r, '/request/done').topic, '/request/done')
  t.alike(moved(r, '/request/done').value, { a: 1 }, 'its value unchanged')
  t.alike(withHeader(r, 'mrepo', { to: '/x' }).headers, { mrepo: { from: null, to: '/x' } }, 'namespaced, merged')
})

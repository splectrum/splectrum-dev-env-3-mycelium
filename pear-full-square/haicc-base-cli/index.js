// haicc-base-cli: HAICC's terminal input, as a library (haicc.js is the
// command line on it). HAICC is a repository's API (docs/design/repositories.md):
// the terminal is one of its inputs. A command is a request, fully qualified,
//   haicc <protocol> <action> <uri> [body]     (haicc rest put /main/x.json '{…}')
//   haicc <action> <uri> [body]                an action unique among the
//                                              protocols, expanded here
// posted as a record to the host's inbox (the root mapping none -> host);
// the repository validates it there, queues it, executes it, records it and
// answers on its outbox; this input takes the answer and prints it. The
// host's runtime is started when it is not running (no command stays
// outside: starting the runtime is the substrate's, the request goes in).
// Checked here only as far as reading it: the URI canonical, the body JSON,
// the protocol and action known.
//   import { send, parse, version } from 'haicc-base-cli'
//   parse(args)                  { protocol, action, uri, body } or { error }
//   send({ work, ...request })   { code, out }: 0 answered ok; 1 refused or
//                                failed (or no host, no answer); the answer
import { join } from 'bare-path'
import { existsSync } from 'bare-fs'
import { validate } from '../mycelium-uri/index.js'
import { ask, start as startRuntime } from '../mrepo-base-runtime/index.js'
import { inbox, outbox, record, INBOX } from '../mrepo-base-request/index.js'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }
export const TYPE = 'haicc'
// The protocols' actions as this input knows them (docs/design/repositories.md).
export const PROTOCOLS = {
  rest: ['get', 'put', 'post', 'delete'],
  service: ['boot', 'initialise', 'start', 'stop', 'pause', 'resume', 'shutdown', 'teardown', 'run']
}

export function parse (args) {
  let [first, ...rest] = args
  let protocol
  if (PROTOCOLS[first]) { protocol = first; first = rest.shift() } else {
    const owners = Object.keys(PROTOCOLS).filter(p => PROTOCOLS[p].includes(first))
    if (owners.length !== 1) return { error: first ? `not an action: ${first} (${Object.entries(PROTOCOLS).map(([p, a]) => `${p}: ${a.join(' ')}`).join('; ')})` : 'a request is needed: [protocol] <action> <uri> [body]' }
    protocol = owners[0]
  }
  const action = first
  if (!PROTOCOLS[protocol].includes(action)) return { error: `not an action of ${protocol}: ${action}` }
  const [uri, body, ...more] = rest
  if (more.length) return { error: `too many arguments: ${more.join(' ')}` }
  if (uri === undefined) return { error: 'a URI is needed' }
  let canonical
  try { canonical = validate(uri) } catch (err) { return { error: err.message } }
  const request = { protocol, action, uri: canonical }
  if (body !== undefined) {
    try { request.body = JSON.parse(body) } catch { return { error: `not a JSON value: ${body}` } }
  }
  return request
}

export async function send ({ work, protocol, action, uri, body, wait = 30000, bundle }) {
  if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no host here: ${work} (not booted)` } }
  const value = { api: TYPE, protocol, action, uri, ...(body !== undefined ? { body } : {}) }
  const name = inbox(work).add(record(INBOX, value, { mrepo: { from: null } }))
  if (!await ask({ work, op: 'status' })) {
    if (!await startRuntime({ work, ...(bundle ? { bundle } : {}) })) return { code: 1, out: { error: 'the runtime did not start (see log/runtime.log)', request: `${INBOX}/${name}` } }
  }
  const out = outbox(work)
  for (const end = Date.now() + wait; Date.now() < end;) {
    if (out.list().includes(name)) {
      const answer = out.read(name)
      out.remove(name)
      return { code: answer.value?.ok ? 0 : 1, out: answer.value }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return { code: 1, out: { error: 'no answer yet', request: `${INBOX}/${name}` } }
}

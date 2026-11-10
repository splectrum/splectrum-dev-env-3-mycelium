// haicc-base-cli: HAICC's terminal input, as a library (haicc.js is the
// command line on it). HAICC is a repository's API (docs/design/repositories.md):
// the terminal is one of its inputs. A command is a request, fully qualified,
//   haicc <protocol> <action> <uri> [body]     (haicc rest put /main/x.json '{…}')
//   haicc <action> <uri> [body]                an action unique among the
//                                              protocols, expanded here
// sent as a pre-filled form in a pre-addressed envelope: the core record, its
// topic this input (/haicc/terminal: where the completed form is to arrive),
// its value the request; wrapped in an envelope addressed to the
// repository's inbox (/<name>/inbox), posted (the root mapping none -> the
// repository): on native git committed into its inbox layer (no
// working tree), on the p2p host a file in the inbox folder (the inbox
// layer's working tree, committed by the runtime); the repository validates
// it, queues it, executes it (completing the form: its output), records it
// and sends the completed form back into its outbox layer, where this input
// reads it (by the request's name) and prints it: a record.
// The runtime is started when it is not running (no command stays outside:
// starting the runtime is the substrate's, the request goes in).
// Checked here only as far as reading it: the URI canonical, the body JSON,
// the protocol and action known.
//   import { send, parse, version } from 'haicc-base-cli'
//   parse(args)                  { protocol, action, uri, body } or { error }
//   send({ work, ...request })   { code, out }: 0 completed with its output; 1
//                                refused or failed (or no repository, no
//                                answer); out the completed form, a record
import fs from 'bare-fs'
import { validate } from '../mycelium-uri/index.js'
import { nativeBackend, p2pgitBackend, openRepo, writer } from '../mycelium-git/index.js'
import { ask, start as startRuntime } from '../mrepo-base-runtime/index.js'
import { post, inboxFolder, record, wrap, guid, setting, isWork, gitdirOf, INBOX } from '../mrepo-base-request/index.js'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }
export const TYPE = 'haicc'
export const ME = '/haicc/terminal'
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

export async function send ({ work, protocol, action, uri, body, command, wait = 30000, bundle }) {
  if (!work || !isWork(work)) return { code: 1, out: { error: `no repository here: ${work} (not booted)` } }
  const { storage, name } = setting(work)
  // The form: the request parsed, and the command as typed (when there is
  // one), easier to read.
  const value = { api: TYPE, ...(command ? { command } : {}), protocol, action, uri, ...(body !== undefined ? { body } : {}) }
  // The core: addressed back to this input, its key a GUID (the request's,
  // traced everywhere; its document's name); in an envelope to the inbox.
  const core = record(ME, value, guid())
  const envelope = wrap(`/${name}${INBOX}`, core)
  const id = core.key
  // The repository's disk side: where its inbox and outbox layers are.
  const disk = storage === 'git' ? nativeBackend(gitdirOf(work, name)) : p2pgitBackend(gitdirOf(work, name), { fs })
  if (storage === 'git') await post({ work, backend: disk, writer: writer(disk), repo: openRepo(disk) }, envelope, id)
  else inboxFolder(work).write(id, envelope)
  if (!await ask({ work, op: 'status' })) {
    if (!await startRuntime({ work, ...(bundle ? { bundle } : {}) })) return { code: 1, out: { error: 'the runtime did not start', request: `${INBOX}/${id}` } }
  }
  const repo = openRepo(disk)
  for (const end = Date.now() + wait; Date.now() < end;) {
    // Read from another process while the runtime writes: on the p2p host's
    // disk side (p2p-git) a ref is written in place, not atomically, so a
    // read may find one missing for a moment: not yet, looked at again.
    const envelope = await repo.read(`/outbox/${id}.json`).then(b => JSON.parse(b.toString()), () => null)
    if (envelope) return { code: 'output' in envelope.value.value ? 0 : 1, out: envelope.value }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return { code: 1, out: { error: 'no answer yet', request: `${INBOX}/${id}` } }
}

// mrepo-base-request: the request protocol, base variant
// (docs/design/repositories.md, "A running repository": the protocols meet in
// data, never by calls). One pass over its data states, given the runtime's
// context ({ work, repo, writer, say }: read access to the repository, the
// store's writer held by the runtime):
//   a record in /inbox            validated (the inbox is the root's
//                                 validation point): its api this repository's
//                                 type (not misdelivered), its URI canonical,
//                                 its protocol and action offered there; then
//                                 a request in request/pending/default, else
//                                 refused and answered (the service state,
//                                 gating the API, checked as it executes)
//   request/execute empty         the next pending request moved in
//   a completed request in        copied into request/done, then cleared from
//   request/execute (its record   request/execute; answered (on the outbox,
//   merged in by execute)         to the input that asked)
// A record keeps its name through its moves; a restart finishes a move half
// done (in both: the old place cleared).
import { validate as canonical } from 'mycelium-uri'
import { inbox, outbox, dispatch, INBOX, OUTBOX } from './lib/boxes.js'
import { record, moved, withHeader } from './lib/record.js'
import { layer, AUTHOR } from './lib/layer.js'
import { viewOf } from './lib/view.js'

export { inbox, outbox, dispatch, INBOX, OUTBOX, record, moved, withHeader, layer, AUTHOR, viewOf }

export const PENDING = 'request/pending/default'
export const EXECUTE = 'request/execute'
export const DONE = 'request/done'

// The service protocol's actions allowed in each service state; any other
// protocol only once started.
export const SERVICE = {
  booted: ['initialise'],
  initialised: ['start', 'shutdown'],
  started: ['stop']
}

// The runtime's data: the service state, the type, the API (once initialised).
export async function runtimeData ({ repo }) {
  const read = async p => { try { return JSON.parse((await repo.read(p)).toString()) } catch { return null } }
  return { service: await read('/runtime/service.json'), api: await read('/runtime/api.json') }
}

// A request checked against the repository's type, its API and, as it
// executes (state: true), the service state: null when allowed, else why not.
// At the inbox the state is not checked: the queue may hold requests that
// change it first (a start behind the preloaded initialise); the API, once
// extracted, is.
export function check (value, { service, api }, { state = true } = {}) {
  if (!value || typeof value !== 'object') return 'not a request'
  if (value.api !== service.type) return `misdelivered: api ${value.api}, this repository is of type ${service.type}`
  let uri
  try { uri = canonical(value.uri ?? '') } catch (err) { return err.message }
  if (uri !== value.uri) return `not canonical: ${value.uri} (${uri})`
  const { protocol, action } = value
  if (protocol === 'service') {
    if (uri !== '/') return `no service at ${uri}`
    if (!Object.values(SERVICE).flat().includes(action)) return `not offered: service ${action}`
    if (!state) return null
    return (SERVICE[service.state] || []).includes(action) ? null : `not now: service ${action} (the service is ${service.state})`
  }
  if (state && service.state !== 'started') return `not now: ${protocol} ${action} (the service is ${service.state}, not started)`
  if (!api) return null
  const type = api.types.find(t => t.uri === uri || (t.deep && uri.startsWith(t.uri === '/' ? '/' : t.uri + '/')))
  if (!type) return `no such resource: ${uri}`
  if (!(type.protocols[protocol] || []).includes(action)) return `not offered: ${protocol} ${action} at ${uri}`
  if (['put', 'post'].includes(action) && value.body === undefined) return `${action} needs a body`
  return null
}

// An answer, on the outbox, to the input that asked: only when the request
// came from one (headers.mrepo.from present).
function answer (work, name, rec, value) {
  if (!('from' in (rec.headers?.mrepo ?? {}))) return
  outbox(work).write(name, record(OUTBOX, value, { mrepo: { to: rec.headers.mrepo.from, re: rec.topic === INBOX ? `${INBOX}/${name}` : name } }))
}

export async function request (ctx) {
  const { work, say = () => {} } = ctx
  const pending = layer(ctx, PENDING)
  const execute = layer(ctx, EXECUTE)
  const done = layer(ctx, DONE)

  // The inbox taken in.
  const box = inbox(work)
  for (const name of box.list()) {
    const rec = box.read(name)
    const why = check(rec.value, await runtimeData(ctx), { state: false })
    if (why) {
      answer(work, name, rec, { ok: false, error: why })
      say({ request: 'refused', record: name, why })
    } else {
      await pending.put(name, moved(rec, `/${PENDING}`), `Request ${name}: ${rec.value.protocol} ${rec.value.action} ${rec.value.uri}`)
      say({ request: 'pending', record: name, protocol: rec.value.protocol, action: rec.value.action, uri: rec.value.uri })
    }
    box.remove(name)
  }

  // A completed request: to done, then out of execute; answered.
  for (const name of await execute.list()) {
    const rec = await execute.read(name)
    if (!rec.headers?.mrepo?.execute?.done) continue
    await done.put(name, moved(rec, `/${DONE}`), `Done ${name}`)
    await execute.remove(name, `Done ${name}: out of execute`)
    answer(work, name, rec, rec.headers.mrepo.execute.result)
    say({ request: 'done', record: name, ok: rec.headers.mrepo.execute.result.ok })
  }

  // The next pending request into execute (a move half done finished first).
  const executing = await execute.list()
  const queued = await pending.list()
  for (const name of queued.filter(n => executing.includes(n))) await pending.remove(name, `${name}: in execute`)
  const next = queued.find(n => !executing.includes(n))
  if (!executing.length && next) {
    const rec = await pending.read(next)
    await execute.put(next, moved(rec, `/${EXECUTE}`), `Execute ${next}`)
    await pending.remove(next, `${next}: in execute`)
    say({ request: 'execute', record: next })
  }
}

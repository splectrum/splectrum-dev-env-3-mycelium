// mrepo-base-request: the request protocol, base variant
// (docs/design/repositories.md, "A running repository": the protocols meet in
// data, never by calls). One pass over its data states, given the runtime's
// context ({ work, name, backend, repo, writer, seen }: read access to
// the repository, the writer held by the runtime). Records are an onion
// (lib/record.js): an envelope around the core, the pre-filled form; each
// hand-over replaces the envelope, the core never changes on the way.
//   new envelopes in the inbox    (its head moved since it last looked: the
//   layer                         records in it in no request layer yet)
//                                 checked (the inbox is the root's validation
//                                 point): addressed to this repository's
//                                 inbox; the form's api this repository's
//                                 type, its URI canonical, its protocol and
//                                 action offered there; then the core, in a
//                                 new envelope, in request/pending/default;
//                                 else refused: the form completed with its
//                                 error, in request/done, and sent back (an
//                                 error taking it in the same: `runtime:
//                                 <message>`)
//   request/execute empty         the next pending request moved in
//   a completed form in           (execute filled it in) its core, in a new
//   request/execute               envelope, in request/done, then cleared
//                                 from request/execute; the completed form
//                                 sent back: in the outbox, in an envelope,
//                                 when its core names where it is to arrive
// A record keeps its name through its moves; a restart finishes a move half
// done (in both: the old place cleared). The boxes (lib/boxes.js) are layers.
import { validate as canonical } from 'mycelium-uri'
import { post, ensure, inboxFolder, INBOX, OUTBOX } from './lib/boxes.js'
import { record, wrap, guid, complete, isComplete } from './lib/record.js'
import { layer, AUTHOR } from './lib/layer.js'
import { viewOf, gitdirOf, setting, isWork, SETTING } from './lib/view.js'

export { post, ensure, inboxFolder, INBOX, OUTBOX, record, wrap, guid, complete, isComplete, layer, AUTHOR, viewOf, gitdirOf, setting, isWork, SETTING }

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
  // An mrepo without the service protocol (no /runtime/service.json: the
  // boot mrepo): no type, no state gate (the runtime's status: a direction).
  if (!service) {
    try { if (canonical(value.uri ?? '') !== value.uri) return `not canonical: ${value.uri}` } catch (err) { return err.message }
    return null
  }
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

// The completed form sent back: in the outbox, in its envelope, when its core
// names where it is to arrive.
async function sendBack (ctx, name, core) {
  if (!core.topic) return
  await ensure(ctx, 'outbox')
  const envelope = wrap(OUTBOX, core)
  await layer(ctx, 'outbox').put(name, envelope, `Output ${name}`)
}

const branches = async ctx => Object.fromEntries(await ctx.backend.listBranches())

// The inbox's records not yet taken in, in the order they arrived (its commit
// chain): in no request layer (every one taken in ends in request/done, a
// refused one too).
export async function untaken (ctx) {
  const b = await branches(ctx)
  if (!b.inbox) return []
  const taken = new Set()
  for (const l of [PENDING, EXECUTE, DONE]) if (b[l]) for (const n of await layer(ctx, l).list()) taken.add(n)
  return (await layer(ctx, 'inbox').arrived()).filter(n => !taken.has(n))
}

export async function request (ctx) {
  ctx.seen ??= {}
  const pending = layer(ctx, PENDING)
  const execute = layer(ctx, EXECUTE)
  const done = layer(ctx, DONE)

  // The inbox taken in, when its head has moved.
  const head = (await branches(ctx)).inbox
  if (head && head !== ctx.seen.inbox) {
    const box = layer(ctx, 'inbox')
    const here = `/${ctx.name}${INBOX}`
    for (const name of await untaken(ctx)) {
      let envelope = null
      let why
      try {
        envelope = await box.read(name)
        why = envelope.topic !== here ? `misdelivered: for ${envelope.topic}, this is ${here}` : check(envelope.value?.value, await runtimeData(ctx), { state: false })
      } catch (err) { why = `runtime: ${err.message}` } // the error in the request it happened to
      const core = envelope?.value
      if (why) {
        const refused = complete(core ?? record(null, null, envelope?.key ?? name), { ok: false, error: why })
        const into = wrap(`/${DONE}`, refused)
        await done.put(name, into, `Refused ${name}`)
        await sendBack(ctx, name, refused)
      } else {
        const into = wrap(`/${PENDING}`, core)
        await pending.put(name, into, `Request ${name}: ${core.value.protocol} ${core.value.action} ${core.value.uri}`)
      }
    }
    ctx.seen.inbox = head
  }

  // A completed form: to done, then out of execute; sent back.
  for (const name of await execute.list()) {
    const core = (await execute.read(name)).value
    if (!isComplete(core)) continue
    const into = wrap(`/${DONE}`, core)
    await done.put(name, into, `Done ${name}`)
    await execute.remove(name, `Done ${name}: out of execute`)
    await sendBack(ctx, name, core)
  }

  // The next pending request into execute (a move half done finished first).
  // The queue in the order requests arrived in it: its commit chain.
  const executing = await execute.list()
  const queued = await pending.arrived()
  for (const name of queued.filter(n => executing.includes(n))) await pending.remove(name, `${name}: in execute`)
  const next = queued.find(n => !executing.includes(n))
  if (!executing.length && next) {
    const core = (await pending.read(next)).value
    const into = wrap(`/${EXECUTE}`, core)
    await execute.put(next, into, `Execute ${next}`)
    await pending.remove(next, `${next}: in execute`)
  }
}

// mrepo-base-request: the request protocol, base variant
//. One pass over its data states, given the runtime's
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
import { post, ensure, inboxFolder, outboxOf, INBOX, OUTBOX } from './lib/boxes.js'
import { record, wrap, guid, complete, isComplete, logger, LEVELS } from './lib/record.js'
import { layer, AUTHOR } from './lib/layer.js'
import { viewOf, gitdirOf, setting, isWork, SETTING } from './lib/view.js'

export { follow } from './lib/follow.js'
export { post, ensure, inboxFolder, outboxOf, INBOX, OUTBOX, record, wrap, guid, complete, isComplete, logger, LEVELS, layer, AUTHOR, viewOf, gitdirOf, setting, isWork, SETTING }

export const PENDING = 'request/pending/default'
export const EXECUTE = 'request/execute'
export const DONE = 'request/done'

// The runtime's data the check reads: the service state (where the mrepo
// has service), and the protocols the runtime loaded, their configs by name
// (ctx.protocols: { <protocol>: { actions: { <action>: { uris, states } } } }).
export async function runtimeData ({ repo, protocols = null }) {
  const read = async p => { try { return JSON.parse((await repo.read(p)).toString()) } catch { return null } }
  return { service: await read('/runtime/service.json'), protocols }
}

// A URI against a pattern of an action's config: segments, <name> any one,
// ** the rest (none too): /, /<name>, /main/**, /**.
export function matches (pattern, uri) {
  const p = pattern.split('/').filter(Boolean)
  const u = uri.split('/').filter(Boolean)
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '**') return true
    if (i >= u.length) return false
    if (!/^<.+>$/.test(p[i]) && p[i] !== u[i]) return false
  }
  return p.length === u.length
}

// A request checked: null when allowed, else why not.
//   always             a form, its URI canonical
//   without service    no more (no /runtime/service.json: no gate)
//   with service       offered: its protocol loaded, its action configured,
//                      its URI one the action's config names; and now (state:
//                      true, as it executes): the service state one of the
//                      action's states (none named: started)
//   internal           the mrepo's own (not from the inbox): not asked
//                      whether offered; the state only where the action's
//                      config names its states (the service's own actions)
// At the inbox the state is not checked (state: false): the queue may hold
// requests that change it first.
export function check (value, { service, protocols }, { state = true, internal = false } = {}) {
  if (!value || typeof value !== 'object') return 'not a request'
  let uri
  try { uri = canonical(value.uri ?? '') } catch (err) { return err.message }
  if (uri !== value.uri) return `not canonical: ${value.uri} (${uri})`
  if (!service) return null
  const { protocol, action } = value
  const cfg = protocols?.[protocol]?.actions?.[action]
  if (!internal) {
    if (!protocols?.[protocol]) return `not offered: ${protocol}`
    if (!cfg) return `not offered: ${protocol} ${action}`
    if (!(cfg.uris || []).some(p => matches(p, uri))) return `not offered: ${protocol} ${action} at ${uri}`
  }
  if (!state) return null
  if (cfg?.states) return cfg.states.includes(service.state) ? null : `not now: ${protocol} ${action} (the service is ${service.state})`
  if (internal) return null
  return service.state === 'started' ? null : `not now: ${protocol} ${action} (the service is ${service.state}, not started)`
}

// The completed form sent back: in the outbox, in its envelope, when its core
// names where it is to arrive.
async function sendBack (ctx, name, core) {
  if (!core.topic) return
  await ensure(ctx, 'outbox')
  const envelope = wrap(OUTBOX, core)
  await layer(ctx, 'outbox').put(name, envelope, `Output ${name}`)
  // Then its working folder: the record, for a subscriber watching it (git
  // first: the folder follows the record). Written whole, renamed into
  // place; the folder made if missing.
  if (ctx.dir) outboxOf(ctx.dir).write(name, envelope)
}

const branches = async ctx => Object.fromEntries(await ctx.backend.listBranches())

// The inbox's records not yet taken in, in the order they arrived (its commit
// chain): in no request layer (every one taken in ends in request/done, a
// refused one too).
// The way into pending, the one handler every request passes: validated by
// where it comes from, then queued; or refused (its form completed with the
// error, in request/done, sent back). The inbox itself checks nothing.
//   origin 'inbox'      the external checks: the API, the state as known now
//   origin 'internal'   the mrepo's own (its runtime's, an action's):
//                       trusted, its URI canonical only
// No mark on the request: internal is having no record in the inbox, which
// keeps its history (isInternal).
// -> { name, queued, refused }
export async function admit (ctx, core, { origin, name = core?.key ?? guid() }) {
  let why = null
  const form = core?.value
  try { why = check(form, await runtimeData(ctx), origin === 'internal' ? { internal: true } : { state: false }) } catch (err) { why = `runtime: ${err.message}` }
  if (why) {
    const refused = complete(core ?? record(null, null, name), { ok: false, error: why })
    await layer(ctx, DONE).put(name, wrap(`/${DONE}`, refused), `Refused ${name}`)
    await sendBack(ctx, name, refused)
    return { name, refused: why }
  }
  await layer(ctx, PENDING).put(name, wrap(`/${PENDING}`, core), `${origin === 'internal' ? 'Internal' : 'Request'} ${name}: ${form.protocol} ${form.action} ${form.uri}`)
  return { name, queued: true }
}

// Whether a request is internal: no record of it in the inbox (the inbox
// keeps every record it was given; a preloaded request is internal too).
export async function isInternal (ctx, name) {
  if (!(await branches(ctx)).inbox) return true
  return !(await layer(ctx, 'inbox').list()).includes(name)
}

// An internal request: the mrepo's own, submitted straight to the handler.
// Its topic null: nobody waits for it. -> admit's result
export const internal = (ctx, form, name = guid()) => admit(ctx, record(null, form, name), { origin: 'internal', name })

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

  // The inbox taken in, when its head has moved, each record through the
  // handler (admit); not while the mrepo is not operational yet (ctx.intake
  // false: its internal requests first; the records wait in the inbox).
  const head = (await branches(ctx)).inbox
  if (head && head !== ctx.seen.inbox && ctx.intake !== false) {
    const box = layer(ctx, 'inbox')
    const here = `/${ctx.name}${INBOX}`
    for (const name of await untaken(ctx)) {
      let envelope = null
      try { envelope = await box.read(name) } catch {}
      // misdelivered: the envelope's, before its content is looked at
      if (envelope && envelope.topic !== here) {
        const refused = complete(envelope.value ?? record(null, null, name), { ok: false, error: `misdelivered: for ${envelope.topic}, this is ${here}` })
        await done.put(name, wrap(`/${DONE}`, refused), `Refused ${name}`)
        await sendBack(ctx, name, refused)
        continue
      }
      await admit(ctx, envelope?.value ?? null, { origin: 'inbox', name })
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

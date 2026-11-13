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
import { existsSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { validate as canonical } from 'mycelium-uri'
import { post, ensure, inboxFolder, inboxOf, outboxOf, INBOX, OUTBOX } from './lib/boxes.js'
import { record, wrap, guid, complete, isComplete, logger, LEVELS } from './lib/record.js'
import { layer, AUTHOR } from './lib/layer.js'
import { viewOf, gitdirOf, setting, isWork, SETTING } from './lib/view.js'
import { interpret, formOf } from './lib/command.js'

export { follow } from './lib/follow.js'
export { post, ensure, inboxFolder, inboxOf, outboxOf, INBOX, OUTBOX, record, wrap, guid, complete, isComplete, logger, LEVELS, layer, AUTHOR, viewOf, gitdirOf, setting, isWork, SETTING, interpret, formOf }

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

// What an action's config asks for and the request does not give: null, or
// `missing argument: <name>`.
//   target    a target is needed: the URI is not / (the mrepo itself, which
//             one cannot deploy or tear down); left out, the URI is /
//   args      the arguments by name, in order; one ending in ? is optional
export function missing (cfg, uri, args = []) {
  if (!cfg) return null
  if (cfg.target && uri === '/') return 'missing argument: target'
  for (const [i, n] of (cfg.args || []).entries()) {
    if (n.endsWith('?')) continue
    if (args?.[i] === undefined || args[i] === '') return `missing argument: ${n}`
  }
  return null
}

// A request checked: null when allowed, else why not.
//   always             a form, its URI canonical; what its action's config
//                      asks for given (missing): a target, its arguments
//   without service    no more (no /runtime/service.json: no gate)
//   with service       offered: its protocol loaded, its action configured,
//                      its URI one the action's config names; and now (state:
//                      true, as it executes): an action that names its
//                      states (the service's own), in one of them; a protocol
//                      behind the service's door (its config: gated), once
//                      the service is started; any other, always
//   internal           the mrepo's own (not from the inbox): not asked
//                      whether offered, not held at the door; its states
//                      where the action names them
// At the inbox the state is not checked (state: false): the queue may hold
// requests that change it first.
export function check (value, { service, protocols }, { state = true, internal = false } = {}) {
  if (!value || typeof value !== 'object') return 'not a request'
  let uri
  try { uri = canonical(value.uri ?? '') } catch (err) { return err.message }
  if (uri !== value.uri) return `not canonical: ${value.uri} (${uri})`
  const { protocol, action } = value
  const cfg = protocols?.[protocol]?.actions?.[action]
  const lacks = missing(cfg, uri, value.args)
  if (!service) return lacks
  if (!internal) {
    if (!protocols?.[protocol]) return `not offered: ${protocol}`
    if (!cfg) return `not offered: ${protocol} ${action}`
    // (before its URI is looked at: a target left out is / and would only
    // be said not offered there)
    if (lacks) return lacks
    if (!(cfg.uris || []).some(p => matches(p, uri))) return `not offered: ${protocol} ${action} at ${uri}`
  }
  if (lacks) return lacks
  if (!state) return null
  if (cfg?.states) return cfg.states.includes(service.state) ? null : `not now: ${protocol} ${action} (the service is ${service.state})`
  if (internal || !protocols?.[protocol]?.gated) return null
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
// The way into pending, the one handler every request passes: a command as
// typed interpreted (its parts: <protocol>/<action> <URI> <arguments>),
// validated by where it comes from, then queued; or refused (its form
// completed with the error, in request/done, sent back). The inbox itself
// checks nothing.
//   origin 'inbox'      the external checks: the API, the state as known now
//   origin 'internal'   the mrepo's own (its runtime's, an action's):
//                       trusted, its URI canonical only
// No mark on the request: internal is having no record in the inbox, which
// keeps its history (isInternal).
// -> { name, queued, refused }
export async function admit (ctx, core, { origin, name = core?.key ?? guid() }) {
  let why = null
  let form = core?.value
  // a command as typed (its parts): interpreted here, the form filled in
  // with its protocol, action, URI and arguments (lib/command.js)
  if (core && (typeof form === 'string' || Array.isArray(form))) { form = { command: form }; core = { ...core, value: form } }
  // a response collected by the mrepo itself (a completed form, for a
  // request waiting here): not a request to interpret or check; queued
  if (origin === 'internal' && isComplete(core)) {
    await layer(ctx, PENDING).put(name, wrap(`/${PENDING}`, core), `Response ${name}`)
    return { name, queued: true }
  }
  try {
    const filled = formOf(form, ctx.protocols ?? {})
    if (filled !== form) { form = filled; core = { ...core, value: form } }
    why = check(form, await runtimeData(ctx), origin === 'internal' ? { internal: true } : { state: false })
  } catch (err) { why = form?.command !== undefined && form.protocol === undefined ? err.message : `runtime: ${err.message}` }
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
  for (const p of await principals(ctx)) taken.add(p.id) // being processed, or waiting, on its own branch
  return (await layer(ctx, 'inbox').arrived()).filter(n => !taken.has(n))
}

// A request's own branch of request/execute: execute/<key>/request/execute.
// The request is processed there, never in request/execute itself, and the
// branch only ever adds: its principal, what it waits for, a child's
// response, its completion; then it is merged into request/execute and
// removed (no history kept in the execute branches: request/done has it).
export const requestBranch = id => `execute/${id}/${EXECUTE}`

// The request branches here, each with its principal (the request the branch
// is named after): { id, branch, core, waits (the child's key it waits for,
// its command passed on), response (the child's completed form, once added) }.
// A branch not being processed has a waiting principal: waits, no response.
export async function principals (ctx) {
  const out = []
  for (const [b] of await ctx.backend.listBranches()) {
    const id = b.match(/^execute\/([^/]+)\/request\/execute$/)?.[1]
    if (!id) continue
    const read = n => ctx.repo.read(`/${b}/${n}.json`).then(x => JSON.parse(x.toString()), () => null)
    const core = (await read(id))?.value
    if (!core) continue
    const waits = core.value?.remote?.key ?? null
    out.push({ id, branch: b, core, waits, response: waits ? (await read(waits))?.value ?? null : null })
  }
  return out
}

// A request begun: its branch made from request/execute, its principal added.
export async function begin (ctx, name, core) {
  const branch = requestBranch(name)
  if (!(await branches(ctx))[branch]) await ctx.writer.createExecution(EXECUTE, name)
  const c = await ctx.writer.change(branch)
  await c.put(`/${name}.json`, Buffer.from(JSON.stringify(wrap(`/${EXECUTE}`, core)) + '\n'))
  await c.commit(`Execute ${name}`, { author: AUTHOR })
}

export async function request (ctx) {
  ctx.seen ??= {}
  const pending = layer(ctx, PENDING)
  const execute = layer(ctx, EXECUTE)
  const done = layer(ctx, DONE)
  // where a response to a request waiting here is addressed: that request's
  // own branch, by this mrepo's unique URI (its name where it has none)
  const mine = `/${ctx.uri ?? ctx.name}/execute/`

  // The waiting principals' responses collected: each child's completed
  // form, from its outbox folder (the linked mrepo's: remote.folder), through
  // the handler into pending, as the mrepo's own.
  const all = await principals(ctx)
  if (ctx.dir) {
    const queuedNow = await pending.list()
    for (const p of all) {
      if (!p.waits || p.response || queuedNow.includes(p.waits)) continue
      const file = join(ctx.dir, p.core.value.remote.folder, 'outbox', `${p.waits}.json`)
      if (!existsSync(file)) continue
      const back = JSON.parse(readFileSync(file, 'utf8')).value
      if (back?.key === p.waits && isComplete(back)) await admit(ctx, back, { origin: 'internal', name: p.waits })
    }
  }

  // The inbox taken in, when its head has moved, each record through the
  // handler (admit); not while the mrepo is not operational yet (ctx.intake
  // false: its internal requests first; the records wait in the inbox).
  const head = (await branches(ctx)).inbox
  if (head && head !== ctx.seen.inbox && ctx.intake !== false) {
    const box = layer(ctx, 'inbox')
    const here = `/${ctx.uri ?? ctx.name}${INBOX}`
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
    // a child's response, merged in with its principal: kept in done, not
    // sent on (it arrived where it was addressed: a request's branch here)
    if (!(typeof core.topic === 'string' && core.topic.startsWith(mine))) await sendBack(ctx, name, core)
  }

  // The next pending request begun on its own branch (a move half done
  // finished first). The queue in the order requests arrived in it: its
  // commit chain. One at a time: not while a request is being processed (a
  // branch whose principal is not waiting) or a completed one is still in
  // request/execute.
  const now = await principals(ctx)
  const queued = await pending.arrived()
  for (const name of queued.filter(n => now.some(p => p.id === n))) await pending.remove(name, `${name}: on its branch`)
  const busy = now.some(p => !p.waits || p.response) || (await execute.list()).length > 0
  const next = queued.find(n => !now.some(p => p.id === n))
  if (!busy && next) {
    const core = (await pending.read(next)).value
    // A response to a principal waiting here (its core addressed to that
    // request's branch, /<mrepo>/execute/<key>): not begun as a request:
    // added to that branch, a record of its own beside the principal; the
    // execute protocol then returns the principal with it.
    const id = isComplete(core) && typeof core.topic === 'string' && core.topic.startsWith(mine) ? core.topic.slice(mine.length) : null
    if (id !== null) {
      const p = now.find(x => x.id === id)
      if (p?.waits === core.key) {
        const c = await ctx.writer.change(p.branch)
        await c.put(`/${core.key}.json`, Buffer.from(JSON.stringify(wrap(`/${EXECUTE}`, core)) + '\n'))
        await c.commit(`${id}: the response of ${core.key}`, { author: AUTHOR })
      } else {
        // nobody waits for it here: kept, in done
        await done.put(next, wrap(`/${DONE}`, core), `Stray response ${next}`)
      }
      await pending.remove(next, `${next}: a response${p ? ` for ${id}` : ''}`)
      return
    }
    await begin(ctx, next, core)
    await pending.remove(next, `${next}: on its branch`)
  }
}

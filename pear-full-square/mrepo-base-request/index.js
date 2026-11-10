// mrepo-base-request: the request protocol, base variant
// (docs/design/repositories.md, "A running repository": the protocols meet in
// data, never by calls). One pass over its data states, given the runtime's
// context ({ work, name, backend, repo, writer, say, seen }: read access to
// the repository, the writer held by the runtime):
//   new records in the inbox      (its head moved since it last looked: the
//   layer                         records in it not yet taken in, i.e. in no
//                                 request layer and not answered) validated
//                                 (the inbox is the root's validation point):
//                                 its api this repository's type (not
//                                 misdelivered), its URI canonical, its
//                                 protocol and action offered there; then a
//                                 request in request/pending/default, else
//                                 refused and answered (the service state,
//                                 gating the API, checked as it executes)
//   request/execute empty         the next pending request moved in
//   a completed request in        copied into request/done, then cleared from
//   request/execute (its record   request/execute; answered (into the outbox
//   merged in by execute)         layer, to the input that asked)
// A record keeps its name through its moves; a restart finishes a move half
// done (in both: the old place cleared). The boxes (lib/boxes.js) are layers:
// posting is a commit into the inbox, an answer a commit into the outbox,
// nothing removed.
import { validate as canonical } from 'mycelium-uri'
import { post, dispatch, ensure, inboxFolder, INBOX, OUTBOX } from './lib/boxes.js'
import { record, moved, withHeader } from './lib/record.js'
import { layer, AUTHOR } from './lib/layer.js'
import { viewOf, gitdirOf, setting, isWork, SETTING } from './lib/view.js'

export { post, dispatch, ensure, inboxFolder, INBOX, OUTBOX, record, moved, withHeader, layer, AUTHOR, viewOf, gitdirOf, setting, isWork, SETTING }

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

// An answer, into the outbox layer: to the input that asked (its `from`;
// none: nobody to answer, kept as the request's record of being refused).
async function answer (ctx, name, rec, value) {
  await ensure(ctx, 'outbox')
  const re = rec.topic === INBOX ? `${INBOX}/${name}` : name
  await layer(ctx, 'outbox').put(name, record(OUTBOX, value, { mrepo: { to: rec.headers?.mrepo?.from ?? null, re } }), `Answer ${name}`)
}

const branches = async ctx => Object.fromEntries(await ctx.backend.listBranches())

// The inbox's records not yet taken in: in no request layer, not answered.
export async function untaken (ctx) {
  const b = await branches(ctx)
  if (!b.inbox) return []
  const taken = new Set()
  for (const l of [PENDING, EXECUTE, DONE, 'outbox']) if (b[l]) for (const n of await layer(ctx, l).list()) taken.add(n)
  return (await layer(ctx, 'inbox').list()).filter(n => !taken.has(n))
}

export async function request (ctx) {
  const { say = () => {} } = ctx
  ctx.seen ??= {}
  const pending = layer(ctx, PENDING)
  const execute = layer(ctx, EXECUTE)
  const done = layer(ctx, DONE)

  // The inbox taken in, when its head has moved.
  const head = (await branches(ctx)).inbox
  if (head && head !== ctx.seen.inbox) {
    const box = layer(ctx, 'inbox')
    for (const name of await untaken(ctx)) {
      const rec = await box.read(name)
      const why = check(rec.value, await runtimeData(ctx), { state: false })
      if (why) {
        await answer(ctx, name, rec, { ok: false, error: why })
        say({ request: 'refused', record: name, why })
      } else {
        await pending.put(name, moved(rec, `/${PENDING}`), `Request ${name}: ${rec.value.protocol} ${rec.value.action} ${rec.value.uri}`)
        say({ request: 'pending', record: name, protocol: rec.value.protocol, action: rec.value.action, uri: rec.value.uri })
      }
    }
    ctx.seen.inbox = head
  }

  // A completed request: to done, then out of execute; answered.
  for (const name of await execute.list()) {
    const rec = await execute.read(name)
    if (!rec.headers?.mrepo?.execute?.done) continue
    await done.put(name, moved(rec, `/${DONE}`), `Done ${name}`)
    await execute.remove(name, `Done ${name}: out of execute`)
    if ('from' in (rec.headers?.mrepo ?? {})) await answer(ctx, name, rec, rec.headers.mrepo.execute.result)
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

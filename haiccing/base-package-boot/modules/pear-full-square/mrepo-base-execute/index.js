// mrepo-base-execute: the execute protocol, base variant. One pass over its
// data state, given the runtime's context ({ name, repo, writer, backend }):
// a request in request/execute (an envelope around the core, the pre-filled
// form), its form not yet completed:
//   1. checked again against the runtime's data as it is now (the service
//      state may have moved since it was queued); its action run inside the
//      execution context (read-only to it, frozen): it reads a target
//      overlaid by the request's execution branch, writes only its execution
//      branches, and reads the runtime's context through it (exec.runtime:
//      the repository's name, its branches, its protocols, read access),
//      never its writer
//   2. its execution branches its own, by its key: execute/<key>/<target>,
//      each made from its target's head as the request first writes there
//      (main, runtime, help, protocols: those the mrepo has)
//   3. each execution branch merged back into its own target, then removed
//      (a failure: removed, nothing merged)
//   4. the form completed with its output (or the error that stopped it),
//      written in its envelope through execute/<key>/request/execute, merged
//      into request/execute (the request completed: the request protocol
//      moves it to done, then starts the next pending)
// executed(ctx, name, record): step 4 alone, a form completed elsewhere (the
// boot's own request) handed over the same way.
// failed(ctx, why): a runtime's pass that failed, its error in the request
// executing (its form completed with it: `runtime: <message>`); the names
// completed ([]: none was executing).
// A wrapped remote command (lib/remote.js): a request whose URI leads into
// another mrepo is passed on whole. Its processing ends there: it is the
// principal of its request branch (the branch's id is its key), its record
// kept on execute/<key>/request/execute with what it waits for, out of
// request/execute (the slot is free). A request branch not being processed
// has a waiting principal. The request protocol adds the child's response
// to that branch; the principal is then returned with it here.
// lib/actions.js: the generic rest actions, the tests' own.
import { layer, wrap, complete, isComplete, logger, AUTHOR, EXECUTE, check, runtimeData, isInternal } from 'mrepo-base-request'
import { ACTIONS } from './lib/actions.js'
import { remoteOf, pass } from './lib/remote.js'

export { ACTIONS }
// The targets an action writes, those the mrepo has: main, runtime, help,
// protocols.
export const TARGETS = ['main', 'runtime', 'help', 'protocols']

const heads = async backend => Object.fromEntries(await backend.listBranches())

// A request's execution branches: its own, by its key, one a target it
// writes: execute/<key>/<target>.
export const branchOf = (id, target) => `execute/${id}/${target}`

// One made from its target's head; there already (a waiting request's):
// brought up to its target. -> its name
async function open (w, backend, id, target) {
  const name = branchOf(id, target)
  if ((await heads(backend))[name]) await w.merge(target, name, `Sync with ${target}`, { author: AUTHOR, fastForward: true })
  else await w.createExecution(target, id)
  return name
}

// One removed: merged or not (a failure's: discarded).
async function close (backend, id, target) {
  const name = branchOf(id, target)
  const at = (await heads(backend))[name]
  if (at) await backend.deleteBranch(name, at)
}

// A request's record written (in its envelope) through its own execution
// branch of request/execute and merged back into it; the branch removed.
export async function executed ({ backend, writer: w }, name, record) {
  const branch = await open(w, backend, name, EXECUTE)
  const c = await w.change(branch)
  await c.put(`/${name}.json`, Buffer.from(JSON.stringify(record) + '\n'))
  await c.commit(`${name}: executed`, { author: AUTHOR })
  await w.merge(branch, EXECUTE, `Merge ${name}: executed`, { author: AUTHOR })
  await close(backend, name, EXECUTE)
}

export async function failed (ctx, why) {
  const requests = layer(ctx, EXECUTE)
  const names = []
  for (const name of await requests.list()) {
    const core = (await requests.read(name)).value
    if (isComplete(core)) continue
    await executed(ctx, name, wrap(`/${EXECUTE}`, complete(core, { ok: false, error: why })))
    names.push(name)
  }
  return names
}

// The runtime's context as an execution reads it: read-only, no writer.
const runtimeView = ctx => Object.freeze({
  name: ctx.name,
  work: ctx.work ?? null,
  dir: ctx.dir ?? null,
  branches: async () => (await ctx.backend.listBranches()).map(([b]) => b),
  // the protocols the runtime loaded, their configs by name
  protocols: ctx.protocols ?? {},
  select: uri => ctx.repo.select(uri),
  read: uri => ctx.repo.read(uri)
})

export async function execute (ctx, { actions = ACTIONS } = {}) {
  const { repo, backend, writer: w } = ctx
  const requests = layer(ctx, EXECUTE)
  // A request branch whose child's response has been added in: its
  // principal (the request the branch is named after) returned with it:
  // completed, written into request/execute through a branch of its own
  // again; the waiting branch, its state used, removed.
  for (const [b] of await backend.listBranches()) {
    const id = b.match(/^execute\/([^/]+)\/request\/execute$/)?.[1]
    if (!id) continue
    const read = async n => repo.read(`/${b}/${n}.json`).then(x => JSON.parse(x.toString()), () => null)
    const principal = (await read(id))?.value
    const key = principal?.value?.remote?.key
    const response = key ? (await read(key))?.value : null
    if (!response || !isComplete(response)) continue
    const result = 'error' in response.value ? { ok: false, error: response.value.error } : { ok: true, value: response.value.output ?? null }
    await close(backend, id, EXECUTE)
    await executed(ctx, id, wrap(`/${EXECUTE}`, complete(principal, result)))
  }
  for (const name of await requests.list()) {
    const core = (await requests.read(name)).value
    if (isComplete(core)) continue
    const form = core.value
    const present = await heads(backend)
    const targets = TARGETS.filter(t => present[t])
    // The action's context: reads overlaid (a target read from the request's
    // execution branch, once it wrote there), writes collected per target.
    // Two contexts: local, the action's (exec.commit(): the writes so far
    // committed to its execution branches, later reads see them;
    // exec.discard(): the uncommitted writes dropped; exec.rollback(): the
    // last local commit undone; exec.reset(): all of it ditched, back to the
    // start), for building up its changes and handling its errors; global,
    // the runtime's, not the action's: when the action ends, its writes
    // committed and its execution branches merged back into their targets,
    // once, then removed; a failure discards them, nothing merged.
    // Its execution branches, made as it first writes a target: each with
    // the head it started from.
    const made = new Map()
    const ensure = async t => { if (!made.has(t)) { const b = await open(w, backend, name, t); made.set(t, (await heads(backend))[b]) } }
    const snapshot = async () => { const h = await heads(backend); return new Map([...made.keys()].map(t => [t, h[branchOf(name, t)]])) }
    const edits = new Map()
    const targetOf = uri => {
      const [, first] = uri.split('/')
      return targets.includes(first) ? first : null
    }
    const inside = uri => uri.slice(uri.indexOf('/', 1) < 0 ? uri.length : uri.indexOf('/', 1)) || '/'
    const { protocol, action } = form
    const message = `${name}: ${protocol} ${action} ${form.uri}`
    // Its log: entries into the request's own record, at or above the
    // mrepo's threshold (/runtime/log.json's level, else info).
    const threshold = await repo.read('/runtime/log.json').then(b => JSON.parse(b.toString()).level, () => 'info')
    const { log, entries } = logger(threshold)
    const flush = async (what = message) => {
      for (const [t, list] of edits) {
        await ensure(t)
        const c = await w.change(branchOf(name, t))
        for (const [op, path, bytes] of list) op === 'put' ? await c.put(path, bytes) : c.remove(path)
        await c.commit(what, { author: AUTHOR })
      }
      edits.clear()
    }
    // Its execution branches set back: to the heads given (one made after:
    // to where it started); the writes not committed discarded.
    const back = async to => {
      edits.clear()
      const now = await heads(backend)
      for (const [t, from] of made) {
        const b = branchOf(name, t)
        const at = to.get(t) ?? from
        if (now[b] !== at) await backend.updateBranch(b, at, now[b])
      }
    }
    const rollbackAll = () => { commits.length = 0; return back(new Map()) }
    // The heads before each local commit: what a rollback goes back to.
    const commits = []
    const exec = Object.freeze({
      runtime: runtimeView(ctx),
      // A URI as the execution sees it: /main/x read from its execution
      // branch of main, once it has one.
      path: uri => made.has(targetOf(uri)) ? `/execute/${name}${uri}` : uri,
      select: uri => repo.select(exec.path(uri)),
      read: uri => repo.read(exec.path(uri)),
      put (uri, bytes) { const b = targetOf(uri); if (!b) throw new Error(`not writable here: ${uri}`); (edits.get(b) ?? edits.set(b, []).get(b)).push(['put', inside(uri), bytes]) },
      remove (uri) { const b = targetOf(uri); if (!b) throw new Error(`not writable here: ${uri}`); (edits.get(b) ?? edits.set(b, []).get(b)).push(['remove', inside(uri)]) },
      // The local commit: the writes so far committed to the execution
      // branches (later reads see them).
      commit: async (what = null) => { commits.push(await snapshot()); return flush(what ? `${message}: ${what}` : message) },
      // The uncommitted writes dropped.
      discard: () => { edits.clear() },
      // The last local commit undone (and what is not committed): back to the
      // commit before it.
      rollback: () => back(commits.length ? commits.pop() : new Map()),
      // Everything of this execution ditched, its local commits too: back to
      // where it started; the action goes on.
      reset: () => rollbackAll(),
      // An entry in the request's log: log(level, event, data), level one of
      // error, warn, info, debug; kept at or above the threshold.
      log
    })
    let result
    // Its URI leading into another mrepo: passed on whole, this request
    // waiting (its state kept on its own branch of request/execute); nothing
    // of it executed here, the other mrepo checks it.
    let to = null
    try { to = await remoteOf(exec, form.uri) } catch {}
    if (to) {
      try {
        // the principal, waiting: its record on its own branch of
        // request/execute (the branch's id its key), out of the slot
        const waiting = wrap(`/${EXECUTE}`, { ...core, value: pass(ctx, name, core, to) })
        const branch = await open(w, backend, name, EXECUTE)
        const c = await w.change(branch)
        await c.put(`/${name}.json`, Buffer.from(JSON.stringify(waiting) + '\n'))
        await c.commit(`${name}: passed on to ${to.at}, waiting`, { author: AUTHOR })
        await requests.remove(name, `${name}: waiting, on its branch`)
      } catch (err) {
        await close(backend, name, EXECUTE)
        await executed(ctx, name, wrap(`/${EXECUTE}`, complete(core, { ok: false, error: err.message })))
      }
      continue
    }
    try {
      // Checked again as it executes: the state now, not as it was queued
      // (two queued while booted: the second initialise refused here).
      // internal (no record of it in the inbox): no API, no state gate
      const why = check(form, await runtimeData(ctx), { internal: await isInternal(ctx, name) })
      if (why) throw new Error(why)
      const fn = actions[protocol]?.[action]
      if (!fn) throw new Error(`no action: ${protocol} ${action}`)
      result = { ok: true, value: (await fn(exec, form)) ?? null }
      await flush()
    } catch (err) {
      result = { ok: false, error: err.message }
      await rollbackAll()
    }
    // Merged back, each execution branch that moved (main first); then
    // removed, merged or discarded.
    if (result.ok) {
      const now = await heads(backend)
      for (const [t, from] of made) if (now[branchOf(name, t)] !== from) await w.merge(branchOf(name, t), t, `Merge ${message}`, { author: AUTHOR })
    }
    for (const t of made.keys()) await close(backend, name, t)
    // The form completed, in its envelope, through its own execution branch.
    await executed(ctx, name, wrap(`/${EXECUTE}`, complete(core, result, entries)))
  }
}

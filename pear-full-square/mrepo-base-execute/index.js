// mrepo-base-execute: the execute protocol, base variant
// (docs/design/repositories.md, "A running repository"). One pass over its
// data state, given the runtime's context ({ repo, writer, backend, say }):
// a request in request/execute, not completed:
//   1. its execution branches made from their targets, or brought up to them:
//      execute/main from main, execute/runtime from runtime,
//      execute/request/execute from request/execute
//   2. checked again against the runtime's data as it is now (the service
//      state may have moved since it was queued); its action instantiated in
//      the execute and runtime contexts: it reads
//      a target overlaid by its execution branch, writes only the execution
//      branches (main, runtime)
//   3. the request's record written into execute/request/execute: its
//      headers.mrepo.execute (the states it ran on, its result, done)
//   4. each execution branch merged back into its own target: main and
//      runtime first, then request/execute (the request completed)
// The base's actions are the framework's generic ones (lib/actions.js); a
// type's own come later, read from its package.
import { layer, withHeader, AUTHOR, EXECUTE, check, runtimeData } from 'mrepo-base-request'
import { ACTIONS } from './lib/actions.js'

export { ACTIONS }
export const TARGETS = ['main', 'runtime']

const heads = async backend => Object.fromEntries(await backend.listBranches())

// An execution branch, made from its target or brought up to it.
async function sync (w, backend, target) {
  if ((await heads(backend))[`execute/${target}`]) await w.merge(target, `execute/${target}`, `Sync with ${target}`, { author: AUTHOR, fastForward: true })
  else await w.createExecution(target)
}

export async function execute (ctx, { actions = ACTIONS } = {}) {
  const { repo, backend, writer: w, say = () => {} } = ctx
  const requests = layer(ctx, EXECUTE)
  for (const name of await requests.list()) {
    const rec = await requests.read(name)
    if (rec.headers?.mrepo?.execute?.done) continue
    for (const t of [...TARGETS, EXECUTE]) await sync(w, backend, t)
    const states = Object.fromEntries(Object.entries(await heads(backend)).filter(([b]) => [...TARGETS, 'packages'].includes(b)))
    // The action's context: reads overlaid (a target read from its execution
    // branch), writes collected per target, committed as one change each.
    const edits = new Map()
    const branchOf = uri => {
      const [, first] = uri.split('/')
      return TARGETS.includes(first) ? first : null
    }
    const inside = uri => uri.slice(uri.indexOf('/', 1) < 0 ? uri.length : uri.indexOf('/', 1)) || '/'
    const exec = {
      // A URI as the execution sees it: /main/x read from execute/main.
      path: uri => branchOf(uri) ? `/execute${uri}` : uri,
      select: uri => repo.select(exec.path(uri)),
      read: uri => repo.read(exec.path(uri)),
      put (uri, bytes) { const b = branchOf(uri); if (!b) throw new Error(`not writable here: ${uri}`); (edits.get(b) ?? edits.set(b, []).get(b)).push(['put', inside(uri), bytes]) },
      remove (uri) { const b = branchOf(uri); if (!b) throw new Error(`not writable here: ${uri}`); (edits.get(b) ?? edits.set(b, []).get(b)).push(['remove', inside(uri)]) }
    }
    const { protocol, action } = rec.value
    let result
    try {
      // Checked again as it executes: the state now, not as it was queued
      // (two queued while booted: the second initialise refused here).
      const why = check(rec.value, await runtimeData(ctx))
      if (why) throw new Error(why)
      const fn = actions[protocol]?.[action]
      if (!fn) throw new Error(`no action: ${protocol} ${action}`)
      result = { ok: true, value: (await fn(exec, rec.value, ctx)) ?? null }
    } catch (err) {
      result = { ok: false, error: err.message }
      edits.clear()
    }
    // The writes, one commit per execution branch; merged back, main first.
    const merged = {}
    for (const [b, list] of edits) {
      const c = await w.change(`execute/${b}`)
      for (const [op, path, bytes] of list) op === 'put' ? await c.put(path, bytes) : c.remove(path)
      await c.commit(`${name}: ${protocol} ${action} ${rec.value.uri}`, { author: AUTHOR })
      merged[b] = await w.merge(`execute/${b}`, b, `Merge ${name}: ${protocol} ${action} ${rec.value.uri}`, { author: AUTHOR })
    }
    // The record, completed, through its own execution branch.
    const completed = withHeader(rec, 'mrepo', { execute: { done: true, states, merged, result } })
    const c = await w.change(`execute/${EXECUTE}`)
    await c.put(`/${name}.json`, Buffer.from(JSON.stringify(completed) + '\n'))
    await c.commit(`${name}: executed`, { author: AUTHOR })
    await w.merge(`execute/${EXECUTE}`, EXECUTE, `Merge ${name}: executed`, { author: AUTHOR })
    say({ execute: 'done', record: name, protocol, action, uri: rec.value.uri, ok: result.ok, ...(result.ok ? {} : { error: result.error }) })
  }
}

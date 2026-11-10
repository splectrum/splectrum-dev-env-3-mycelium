// mrepo-base-execute: the execute protocol, base variant
// (docs/design/repositories.md, "A running repository"). One pass over its
// data state, given the runtime's context ({ name, repo, writer, backend }):
// a request in request/execute (an envelope around the core, the pre-filled
// form), its form not yet completed:
//   1. its execution branches made from their targets, or brought up to them:
//      execute/main from main, execute/runtime from runtime,
//      execute/request/execute from request/execute
//   2. checked again against the runtime's data as it is now (the service
//      state may have moved since it was queued); its action run inside the
//      execution context (read-only to it, frozen): it reads a target
//      overlaid by its execution branch, writes only the execution branches
//      (main, runtime), and reads the runtime's context through it
//      (exec.runtime: the repository's name, its branches, read access; for
//      config later), never its writer
//   3. the form completed with its output (or the error that stopped it),
//      written in its envelope into execute/request/execute
//   4. each execution branch merged back into its own target: main and
//      runtime first, then request/execute (the request completed: the
//      request protocol moves it to done, then starts the next pending)
// executed(ctx, name, completed): steps 3 and 4 for request/execute alone, a
// form completed elsewhere (the boot's own request) handed over the same way.
// failed(ctx, why): a runtime's pass that failed, its error in the request
// executing (its form completed with it: `runtime: <message>`); the names
// completed ([]: none was executing).
// The base's actions are the framework's generic ones (lib/actions.js); a
// type's own come later, read from its package.
import { layer, wrap, complete, isComplete, AUTHOR, EXECUTE, check, runtimeData } from 'mrepo-base-request'
import { ACTIONS } from './lib/actions.js'

export { ACTIONS }
export const TARGETS = ['main', 'runtime']

const heads = async backend => Object.fromEntries(await backend.listBranches())

// An execution branch, made from its target or brought up to it.
async function sync (w, backend, target) {
  if ((await heads(backend))[`execute/${target}`]) await w.merge(target, `execute/${target}`, `Sync with ${target}`, { author: AUTHOR, fastForward: true })
  else await w.createExecution(target)
}

// A form completed (in its envelope), written through request/execute's own
// execution branch and merged back into it.
export async function executed ({ backend, writer: w }, name, completed) {
  await sync(w, backend, EXECUTE)
  const c = await w.change(`execute/${EXECUTE}`)
  await c.put(`/${name}.json`, Buffer.from(JSON.stringify(completed) + '\n'))
  await c.commit(`${name}: executed`, { author: AUTHOR })
  await w.merge(`execute/${EXECUTE}`, EXECUTE, `Merge ${name}: executed`, { author: AUTHOR })
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
  branches: async () => (await ctx.backend.listBranches()).map(([b]) => b),
  select: uri => ctx.repo.select(uri),
  read: uri => ctx.repo.read(uri)
})

export async function execute (ctx, { actions = ACTIONS } = {}) {
  const { repo, backend, writer: w } = ctx
  const requests = layer(ctx, EXECUTE)
  for (const name of await requests.list()) {
    const core = (await requests.read(name)).value
    if (isComplete(core)) continue
    const form = core.value
    for (const t of [...TARGETS, EXECUTE]) await sync(w, backend, t)
    // The action's context: reads overlaid (a target read from its execution
    // branch), writes collected per target, committed as one change each.
    const edits = new Map()
    const branchOf = uri => {
      const [, first] = uri.split('/')
      return TARGETS.includes(first) ? first : null
    }
    const inside = uri => uri.slice(uri.indexOf('/', 1) < 0 ? uri.length : uri.indexOf('/', 1)) || '/'
    const exec = Object.freeze({
      runtime: runtimeView(ctx),
      // A URI as the execution sees it: /main/x read from execute/main.
      path: uri => branchOf(uri) ? `/execute${uri}` : uri,
      select: uri => repo.select(exec.path(uri)),
      read: uri => repo.read(exec.path(uri)),
      put (uri, bytes) { const b = branchOf(uri); if (!b) throw new Error(`not writable here: ${uri}`); (edits.get(b) ?? edits.set(b, []).get(b)).push(['put', inside(uri), bytes]) },
      remove (uri) { const b = branchOf(uri); if (!b) throw new Error(`not writable here: ${uri}`); (edits.get(b) ?? edits.set(b, []).get(b)).push(['remove', inside(uri)]) }
    })
    const { protocol, action } = form
    let result
    try {
      // Checked again as it executes: the state now, not as it was queued
      // (two queued while booted: the second initialise refused here).
      const why = check(form, await runtimeData(ctx))
      if (why) throw new Error(why)
      const fn = actions[protocol]?.[action]
      if (!fn) throw new Error(`no action: ${protocol} ${action}`)
      result = { ok: true, value: (await fn(exec, form)) ?? null }
    } catch (err) {
      result = { ok: false, error: err.message }
      edits.clear()
    }
    // The writes, one commit per execution branch; merged back, main first.
    for (const [b, list] of edits) {
      const c = await w.change(`execute/${b}`)
      for (const [op, path, bytes] of list) op === 'put' ? await c.put(path, bytes) : c.remove(path)
      await c.commit(`${name}: ${protocol} ${action} ${form.uri}`, { author: AUTHOR })
      await w.merge(`execute/${b}`, b, `Merge ${name}: ${protocol} ${action} ${form.uri}`, { author: AUTHOR })
    }
    // The form completed, in its envelope, through its own execution branch.
    await executed(ctx, name, wrap(`/${EXECUTE}`, complete(core, result)))
  }
}

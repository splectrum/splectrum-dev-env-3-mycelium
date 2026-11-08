// The engine: requirements compared with the world through their kinds'
// providers; a check, a plan, and the plan carried out (notes/haicc-reconcile.md).
//   const e = createEngine({ providers, owner, record })
//   await e.check(requirements, { strict })   [{ name, kind, status, fixable, detail, hint }]
//                                              (blocked: a need not met and not fixable)
//   await e.plan(requirements, { strict })    [{ name, kind, action: create|update|remove }]
//   await e.apply(requirements, { strict })   { done, failed, blocked, after }
//   await e.remove(requirements, { only })    what this owner made, taken away, in reverse order
//
// A requirement: { name, kind, want, needs: [names] } (name defaults to kind).
// A provider, one per kind, the only place knowing it:
//   observe(req, ctx)          what is there (null: nothing)
//   compare(req, actual)       { status: met | missing | different, detail }
//   create(req, ctx, actual)   make it so (kinds the tool may create)
//   remove(req, ctx, actual)   take it away (only what `owned` says is ours)
//   owned(actual, ctx)         made by this owner?
//   hint(req, actual)          for what only a human can fix
//   extras(reqs, ctx)          what is there in the provider's scope and not declared
//                              (given every requirement; it picks what concerns it)
// Statuses: met; missing or different, fixable or not; extra. Non-strict
// (the default) leaves extras; strict removes those it owns. Never what
// someone else made.

export function createEngine ({ providers, owner = 'haicc', record = null, context = {} }) {
  // What providers are given: the owner, and what the caller adds (ask: a
  // yes asked of a person, for a provider that changes the machine).
  const ctx = { ...context, owner }
  const note = async v => { if (record) await record({ time: Date.now(), ...v }) }
  const providerOf = req => {
    const p = providers[req.kind]
    if (!p) throw new Error(`no provider for kind: ${req.kind}`)
    return p
  }
  const named = reqs => reqs.map(r => ({ needs: [], ...r, name: r.name || r.kind }))

  // Dependency order; a cycle or an unknown name is an error of the declaration.
  function order (reqs) {
    const byName = new Map(reqs.map(r => [r.name, r]))
    if (byName.size !== reqs.length) throw new Error('requirement names are not unique')
    const out = []
    const state = new Map()
    const visit = (r, path) => {
      if (state.get(r.name) === 'done') return
      if (state.get(r.name) === 'visiting') throw new Error(`a cycle: ${[...path, r.name].join(' -> ')}`)
      state.set(r.name, 'visiting')
      for (const n of r.needs) {
        if (!byName.has(n)) throw new Error(`${r.name} needs ${n}, which is not declared`)
        visit(byName.get(n), [...path, r.name])
      }
      state.set(r.name, 'done')
      out.push(r)
    }
    for (const r of reqs) visit(r, [])
    return out
  }

  async function checkOne (r) {
    const p = providerOf(r)
    const actual = await p.observe(r, ctx)
    const { status, detail = null } = p.compare(r, actual)
    const mine = actual != null && p.owned ? Boolean(p.owned(actual, ctx)) : false
    const fixable = status === 'met' ? null
      : status === 'missing' ? Boolean(p.create)
        : Boolean(p.create) && mine
    const out = { name: r.name, kind: r.kind, status, fixable, detail }
    if (fixable === false && p.hint) out.hint = p.hint(r, actual)
    return { ...out, actual, mine }
  }

  async function extrasOf (reqs) {
    const out = []
    for (const [kind, p] of Object.entries(providers)) {
      if (!p.extras) continue
      // Every requirement: a provider decides what concerns it (a swarm's
      // nodes are found from the selections too).
      for (const x of await p.extras(reqs, ctx)) {
        out.push({ name: x.name, kind, status: 'extra', mine: p.owned ? Boolean(p.owned(x.actual, ctx)) : false, actual: x.actual })
      }
    }
    return out
  }

  const visible = ({ actual, ...rest }) => rest

  async function check (requirements, { strict = false } = {}) {
    const reqs = order(named(requirements))
    const results = []
    const unmet = new Set()
    for (const r of reqs) {
      // A need that is not met and cannot be fixed blocks what needs it:
      // observing it would say nothing true.
      const stuck = r.needs.filter(n => unmet.has(n))
      if (stuck.length) { unmet.add(r.name); results.push({ name: r.name, kind: r.kind, status: 'blocked', fixable: false, detail: { needs: stuck } }); continue }
      const c = await checkOne(r)
      if (c.status !== 'met' && !c.fixable) unmet.add(r.name)
      results.push(c)
    }
    for (const x of await extrasOf(reqs)) results.push({ ...x, fixable: strict ? x.mine && Boolean(providers[x.kind].remove) : null })
    for (const x of results) await note({ phase: 'check', ...visible(x) })
    return results.map(visible)
  }

  async function plan (requirements, { strict = false } = {}) {
    const reqs = order(named(requirements))
    const steps = []
    for (const r of reqs) {
      const c = await checkOne(r)
      if (c.status === 'missing' && c.fixable) steps.push({ name: r.name, kind: r.kind, action: 'create' })
      else if (c.status === 'different' && c.fixable) steps.push({ name: r.name, kind: r.kind, action: 'update' })
    }
    if (strict) {
      for (const x of await extrasOf(reqs)) if (x.mine && providers[x.kind].remove) steps.push({ name: x.name, kind: x.kind, action: 'remove', extra: true })
    }
    return steps
  }

  async function apply (requirements, { strict = false } = {}) {
    const reqs = order(named(requirements))
    const done = []; const failed = []; const blocked = []
    const unmet = new Set()
    for (const r of reqs) {
      const stuck = r.needs.filter(n => unmet.has(n))
      if (stuck.length) { unmet.add(r.name); blocked.push({ name: r.name, needs: stuck }); await note({ phase: 'apply', name: r.name, kind: r.kind, action: 'blocked', needs: stuck }); continue }
      const c = await checkOne(r)
      if (c.status === 'met') continue
      if (!c.fixable) { unmet.add(r.name); failed.push({ name: r.name, status: c.status, hint: c.hint || null }); await note({ phase: 'apply', name: r.name, kind: r.kind, action: 'none', status: c.status, hint: c.hint || null }); continue }
      const action = c.status === 'missing' ? 'create' : 'update'
      const t0 = Date.now()
      try {
        const result = await providerOf(r).create(r, ctx, c.actual)
        done.push({ name: r.name, action, result: result ?? null })
        await note({ phase: 'apply', name: r.name, kind: r.kind, action, ok: true, ms: Date.now() - t0 })
      } catch (err) {
        unmet.add(r.name)
        failed.push({ name: r.name, action, error: err.message })
        await note({ phase: 'apply', name: r.name, kind: r.kind, action, ok: false, error: err.message, ms: Date.now() - t0 })
      }
    }
    if (strict) {
      for (const x of await extrasOf(reqs)) {
        if (!x.mine || !providers[x.kind].remove) continue
        try {
          await providers[x.kind].remove({ name: x.name, kind: x.kind }, ctx, x.actual)
          done.push({ name: x.name, action: 'remove', extra: true })
          await note({ phase: 'apply', name: x.name, kind: x.kind, action: 'remove', extra: true, ok: true })
        } catch (err) {
          failed.push({ name: x.name, action: 'remove', error: err.message })
        }
      }
    }
    return { done, failed, blocked, after: await check(requirements, { strict }) }
  }

  // Teardown: what this owner made, taken away, dependents first.
  async function remove (requirements, { only = null } = {}) {
    // `only`: the names to act on, ordered within the whole declaration
    // (stopping what runs, keeping the configuration it needs).
    const reqs = order(named(requirements)).reverse().filter(r => !only || only.includes(r.name))
    const done = []; const failed = []; const kept = []
    for (const r of reqs) {
      const p = providerOf(r)
      if (!p.remove) continue // checked only: nothing to take away
      const actual = await p.observe(r, ctx)
      if (actual == null) continue
      if (!p.owned || !p.owned(actual, ctx)) { kept.push(r.name); continue }
      try {
        await p.remove(r, ctx, actual)
        done.push(r.name)
        await note({ phase: 'remove', name: r.name, kind: r.kind, ok: true })
      } catch (err) {
        failed.push({ name: r.name, error: err.message })
        await note({ phase: 'remove', name: r.name, kind: r.kind, ok: false, error: err.message })
      }
    }
    return { done, failed, kept }
  }

  return { check, plan, apply, remove }
}

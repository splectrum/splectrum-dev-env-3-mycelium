// The requests followed, as they move: each record arriving in an mrepo's request
// layers (pending, execute, done), and its children's in view
// (<dir>/main/<name>/, theirs too), printed as it is stored, one compact line
// a record, its envelope's topic the full path (/boot/request/done,
// /boot/main/host/request/pending/default). For a terminal.
//   follow({ dir, name, every, print })   dir: the mrepo's folder; name: its
//                                         URI part (/boot); print: a line
//                                         out (console.log by default)
//   -> { stop, pass, settled }            pass(): one round, now; settled():
//                                         every request done (none pending,
//                                         executing or waiting on a request
//                                         branch in any of them, at least one
//                                         done)
// What is there when it starts is printed first (the history so far).
import fs, { existsSync, readdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { openRepo, p2pgitBackend } from 'mycelium-git'
import { layer, CONFIG } from './layer.js'

const LAYERS = ['request/pending/default', 'request/execute', 'request/done']

// The mrepo and its children in view, each [folder, its full path].
function mrepos (dir, path) {
  const found = [[dir, path]]
  const main = join(dir, 'main')
  if (existsSync(main)) {
    for (const n of readdirSync(main).sort()) {
      if (existsSync(join(main, n, '.git'))) found.push(...mrepos(join(main, n), `${path}/main/${n}`))
    }
  }
  return found
}

export function follow ({ dir, name, every = 200, print = line => console.log(line) }) {
  const seen = new Set()
  const opened = new Map()
  let busy = false
  async function pass () {
    if (busy) return
    busy = true
    try {
      for (const [d, path] of mrepos(dir, `/${name}`)) {
        if (!opened.has(d)) { const backend = p2pgitBackend(join(d, '.git'), { fs }); opened.set(d, { backend, repo: openRepo(backend) }) }
        const ctx = opened.get(d)
        const heads = Object.fromEntries(await ctx.backend.listBranches().catch(() => []))
        for (const l of LAYERS) {
          if (!heads[l]) continue
          for (const n of await layer(ctx, l).arrived()) {
            if (n === CONFIG) continue
            const key = `${path}|${l}|${n}`
            if (seen.has(key)) continue
            seen.add(key)
            const rec = await layer(ctx, l).read(n).catch(() => null)
            if (rec) print(JSON.stringify({ ...rec, topic: `${path}${rec.topic}` }))
          }
        }
      }
    } finally { busy = false }
  }
  // Settled: nothing pending or executing anywhere, something done.
  async function settled () {
    let done = 0
    for (const [d] of mrepos(dir, `/${name}`)) {
      const ctx = opened.get(d)
      if (!ctx) return false
      const heads = Object.fromEntries(await ctx.backend.listBranches().catch(() => []))
      // a request branch: a principal waiting for a response, not done yet
      if (Object.keys(heads).some(b => /^execute\/[^/]+\/request\/execute$/.test(b))) return false
      for (const l of LAYERS) {
        if (!heads[l]) continue
        const n = (await layer(ctx, l).list()).length
        if (l === 'request/done') done += n
        else if (n) return false
      }
    }
    return done > 0
  }
  const timer = setInterval(() => { pass().catch(() => {}) }, every)
  return { pass, settled, stop: () => clearInterval(timer) }
}

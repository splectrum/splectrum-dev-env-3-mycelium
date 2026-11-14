// The commits measured: what the repository engine does on this machine,
// so a commit frequency can be chosen from numbers. One line of JSON a
// measurement, as each ends; the last line says it is done. It works in a
// folder of its own and removes it.
//   tools/bare tools/commit-bench.js [--only <name>,...] [--writers 1,2,4] [--runs <n>] [--dir <folder>]
//
// The measurements (--only takes their names):
//   machine    the cores, Bare, the folder worked in
//   loop       what the cores give: a plain loop on one thread, on all
//   writers    writers at once, each on its own branch of one layer
//              (execute/<id>/main), as threads and as processes
//   width      one writer, the folder written into 10 to 10000 children wide
//   history    one writer, one branch, 12000 commits: the rate as it grows
//   corestore  one writer, main in a Corestore (a Hyperdrive under p2p-git)
//   native     one writer, native git (a git process an operation)
//   cycle      a request's cycle on one thread, 200 times: its branch made
//              from main, a commit, a plain merge into main, the branch
//              removed; with the two calls that grow
//
// Everything is on the filesystem with the p2p-git engine unless its name
// says otherwise. A commit puts one small document at
// swarms/n<x>/.node.json, a folder of 100 children. Nothing is forced to
// disk. bare-thread is in node_modules as brittle's and bare-fs's.
import os from 'bare-os'
import { spawn, spawnSync } from 'bare-subprocess'
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'bare-fs'
import { join, resolve } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import Thread from 'bare-thread'
import { createFs } from 'p2p-git/hyperdrive-fs'
import { p2pgitBackend, nativeBackend, writer } from '../pear-full-square/mycelium-git/index.js'
import { openStore } from '../pear-full-square/p2p-store/index.js'
import { AUTHOR, WRITER, doc } from './lib/commit-bench-worker.js'

const self = fileURLToPath(import.meta.url)
const workerPath = fileURLToPath(new URL('./lib/commit-bench-worker.js', import.meta.url))
const author = AUTHOR
const cores = os.availableParallelism()

// --- the command line ---
const argv = Bare.argv.slice(2)
const option = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1] }
const ALL = ['machine', 'loop', 'writers', 'width', 'history', 'corestore', 'native', 'cycle']
const only = option('--only') ? option('--only').split(',') : ALL
const unknown = only.filter(n => !ALL.includes(n))
if (unknown.length) { console.log(JSON.stringify({ ok: false, error: `no such measurement: ${unknown.join(', ')} (${ALL.join(', ')})` })); Bare.exit(1) }
// 1, 2, 4, 8... up to twice the cores, and the cores themselves
const writersList = option('--writers')
  ? option('--writers').split(',').map(Number)
  : [...new Set([1, 2, 4, 8, 12, 16, 24, 32].filter(n => n <= 2 * cores).concat(cores))].sort((a, b) => a - b)
const runs = Number(option('--runs') || 3)
const base = option('--dir') ? resolve(option('--dir')) : os.tmpdir()
mkdirSync(base, { recursive: true })
const dir = mkdtempSync(join(base, 'commit-bench-'))

const say = o => console.log(JSON.stringify(o))
const perSecond = (n, ms) => Math.round(n / ms * 1000)
const remove = d => rmSync(d, { recursive: true, force: true })

// A repository on the filesystem, main seeded: `width` nodes in swarms/.
async function seeded (width, backendOf = p2pgitBackend) {
  const repo = mkdtempSync(join(dir, 'repo-'))
  const gitdir = join(repo, '.git')
  const backend = backendOf(gitdir)
  await backend.init()
  const w = writer(backend)
  await seed(w, width)
  return { repo, gitdir, backend, w }
}

async function seed (w, width, folder = 'swarms') {
  await w.createLayer('main', 'main', { author })
  const change = await w.change('main')
  for (let n = 0; n < width; n++) await change.put(`${folder}/n${n}/.node.json`, doc(n))
  await change.commit('seed', { author })
}

// K commits by this thread on a branch, numbered from `from`: the rate.
async function commits (w, branch, K, path, from = 0) {
  const t0 = Date.now()
  for (let k = from; k < from + K; k++) {
    const change = await w.change(branch)
    await change.put(path(k), doc(k))
    await change.commit(`commit ${k}`, { author })
  }
  return perSecond(K, Date.now() - t0)
}

// --- the measurements ---
const measures = {
  machine () {
    say({ measure: 'machine', cores, platform: os.platform(), arch: os.arch(), bare: Bare.version, dir })
  },

  // A plain loop on one thread, then on as many as there are cores.
  loop () {
    const source = Buffer.from('let x = 0; for (let i = 0; i < 4e8; i++) x += i % 7')
    const timed = n => {
      const t0 = Date.now()
      const threads = Array.from({ length: n }, () => new Bare.Thread(self, { source }))
      for (const t of threads) t.join()
      return Date.now() - t0
    }
    const one = timed(1)
    const all = timed(cores)
    say({ measure: 'loop', oneThreadMs: one, threads: cores, allAtOnceMs: all, gain: Number((cores * one / all).toFixed(1)) })
  },

  async writers () {
    const bundle = Thread.prepare(workerPath)
    const mount = Thread.mountFor(workerPath)
    for (const mode of ['threads', 'processes']) {
      for (const W of writersList) {
        const rates = []; const errors = []; let late = 0
        for (let r = 0; r < runs; r++) {
          const { repo, gitdir, w } = await seeded(100)
          for (let i = 0; i < W; i++) await w.createExecution('main', `r${i}`)
          const out = join(repo, 'out'); mkdirSync(out)
          // every writer loaded and waiting before the start
          const start = Date.now() + 2000 + 200 * W
          const args = i => JSON.stringify({ gitdir, branch: `execute/r${i}/main`, i, commits: 300, width: 100, start, out })
          if (mode === 'threads') {
            const threads = Array.from({ length: W }, (_, i) => new Thread(bundle, { mount, data: Buffer.from(args(i)) }))
            // a join blocks this thread: wait for the writers' files first
            while (readdirSync(out).length < W) await new Promise(resolve => setTimeout(resolve, 20))
            for (const t of threads) t.join()
          } else {
            await Promise.all(Array.from({ length: W }, (_, i) => new Promise(resolve => spawn(Bare.argv[0], [workerPath, WRITER, args(i)], { stdio: 'inherit' }).on('exit', resolve))))
          }
          const results = Array.from({ length: W }, (_, i) => JSON.parse(readFileSync(join(out, `w${i}.json`), 'utf8')))
          const done = results.reduce((n, x) => n + x.done, 0)
          rates.push(perSecond(done, Math.max(...results.map(x => x.ended)) - Math.min(...results.map(x => x.began))))
          late = Math.max(late, Math.max(...results.map(x => x.began)) - start)
          for (const x of results) if (x.error) errors.push(x.error)
          remove(repo)
        }
        say({ measure: 'writers', mode, writers: W, commitsEach: 300, commitsPerSecond: rates, errors: errors.length, firstError: errors[0] || null, lateStartMs: late })
      }
    }
  },

  async width () {
    for (const [width, K] of [[10, 300], [100, 300], [1000, 200], [10000, 40]]) {
      const { repo, w } = await seeded(width)
      say({ measure: 'width', children: width, commitsPerSecond: await commits(w, 'main', K, k => `swarms/n${(k * 31) % width}/.node.json`) })
      remove(repo)
    }
    const repo = mkdtempSync(join(dir, 'repo-'))
    const backend = p2pgitBackend(join(repo, '.git')); await backend.init()
    const w = writer(backend)
    await seed(w, 100, 'l1/l2/l3/l4/l5/swarms')
    say({ measure: 'width', children: 100, levelsDeeper: 5, commitsPerSecond: await commits(w, 'main', 300, k => `l1/l2/l3/l4/l5/swarms/n${k % 100}/.node.json`) })
    remove(repo)
  },

  async history () {
    const { repo, gitdir, w } = await seeded(100)
    const rates = {}
    for (let upTo = 2000; upTo <= 12000; upTo += 2000) rates[upTo] = await commits(w, 'main', 2000, k => `swarms/n${k % 100}/.node.json`, upTo - 2000)
    let objects = 0
    for (const d of readdirSync(join(gitdir, 'objects'))) if (d.length === 2) objects += readdirSync(join(gitdir, 'objects', d)).length
    say({ measure: 'history', commits: 12000, commitsPerSecondUpTo: rates, looseObjects: objects })
    remove(repo)
  },

  async corestore () {
    const repo = mkdtempSync(join(dir, 'store-'))
    const store = await openStore({ storage: join(repo, 'store') })
    const drive = await store.own('mrepo/commit-bench')
    const backend = p2pgitBackend('/', { fs: createFs(drive) }); await backend.init()
    const w = writer(backend)
    await seed(w, 100)
    say({ measure: 'corestore', commitsPerSecond: await commits(w, 'main', 300, k => `swarms/n${k % 100}/.node.json`) })
    await store.close()
    remove(repo)
  },

  async native () {
    const repo = mkdtempSync(join(dir, 'native-'))
    let made = null
    try { made = spawnSync('git', ['init', '-q', '--bare', repo]) } catch {}
    if (!made || made.status !== 0) { say({ measure: 'native', skipped: 'no git here' }); return }
    const w = writer(nativeBackend(repo))
    await seed(w, 100)
    say({ measure: 'native', commitsPerSecond: await commits(w, 'main', 100, k => `swarms/n${k % 100}/.node.json`) })
    remove(repo)
  },

  // What the one thread does for a request, and what of it grows: the
  // backend's calls timed, the two that grow reported.
  async cycle () {
    const calls = {}
    const timedBackend = gitdir => {
      const raw = p2pgitBackend(gitdir); const timed = {}
      for (const k of Object.keys(raw)) {
        timed[k] = typeof raw[k] !== 'function'
          ? raw[k]
          : async (...a) => { const t0 = Date.now(); try { return await raw[k](...a) } finally { const c = calls[k] ??= { ms: 0, n: 0 }; c.ms += Date.now() - t0; c.n++ } }
      }
      return timed
    }
    const { repo, gitdir, w } = await seeded(100, timedBackend)
    const step = { branch: 0, commit: 0, merge: 0, remove: 0 }
    const timed = async (name, f) => { const t0 = Date.now(); await f(); step[name] += Date.now() - t0 }
    const each = n => Number((n / 50).toFixed(1))
    const aCall = k => calls[k] ? { msACall: Number((calls[k].ms / calls[k].n).toFixed(1)), callsARequest: Number((calls[k].n / 50).toFixed(1)) } : null
    for (const k in calls) delete calls[k]
    for (let n = 1; n <= 200; n++) {
      const branch = `execute/q${n}/main`
      await timed('branch', () => w.createExecution('main', `q${n}`))
      await timed('commit', async () => { const change = await w.change(branch); await change.put(`swarms/n${n % 100}/.node.json`, doc(n)); await change.commit('commit', { author }) })
      await timed('merge', () => w.merge(branch, 'main', 'merge', { author }))
      await timed('remove', () => w.deleteBranch(branch, 'main'))
      if (n % 50 === 0) {
        const together = step.branch + step.commit + step.merge + step.remove
        say({ measure: 'cycle', requests: `${n - 49} to ${n}`, msEach: { branchMade: each(step.branch), aCommit: each(step.commit), mergeIntoMain: each(step.merge), branchRemoved: each(step.remove), together: each(together) }, listBranches: aCall('listBranches'), isAncestor: aCall('isAncestor') })
        for (const k in step) step[k] = 0
        for (const k in calls) delete calls[k]
      }
    }
    // what the removed branches left under refs/
    const count = d => readdirSync(d, { withFileTypes: true }).reduce((n, e) => e.isDirectory() ? { files: n.files + count(join(d, e.name)).files, folders: n.folders + 1 + count(join(d, e.name)).folders } : { files: n.files + 1, folders: n.folders }, { files: 0, folders: 0 })
    say({ measure: 'cycle', after: 200, underRefs: count(join(gitdir, 'refs')) })
    remove(repo)
  }
}

const began = Date.now()
let ok = true
for (const name of ALL) {
  if (!only.includes(name)) continue
  try { await measures[name]() } catch (e) { ok = false; say({ measure: name, error: String(e.message).split('\n')[0] }) }
}
remove(dir)
say({ ok, measure: 'done', measured: only, seconds: Math.round((Date.now() - began) / 1000) })
if (!ok) Bare.exit(1)

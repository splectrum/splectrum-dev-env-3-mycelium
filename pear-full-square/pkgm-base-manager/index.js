// The package manager: from packages made (never making them: that is the
// development environment's, the other side of the airgap) into a swarm's
// package repository on its master. Node's built-ins only.
//   assemble({ from, swarm, into })   a swarm's codebase: its reference
//        list (swarms/<swarm>/modules.json) and what those use, taken from
//        the package's modules/, into the repository `into` (whole or
//        nothing: staged beside it, then moved in place); contents.json
//        says what is there and where it came from
//   testPackage(dir)   a package's (or a repository's) tests, bottom up:
//        its modules' own, its swarms', its named tests (test/<test>/test);
//        each run stopped and failed after `timeout` (10 minutes)
//   contentsOf(dir)    a repository's contents.json, or null
//   deploy({ from, into })   a package deployed properly: staged beside `into`
//        (hard links), checked intact, its validation set run there; only then
//        put in place; else nothing changed
//   packageHash(dir)   a package's identity (what the package writer records)
//   verify(dir)        the package intact: its hash against its package.json's
// A package's structure: notes/packages.md, "Packages, platforms, swarms
// and tests".
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, statSync, symlinkSync } from 'bare-fs'
import { join, dirname, resolve, relative, basename } from 'bare-path'
import { spawnSync } from 'bare-subprocess'
import { walk, copy, hashTree, remove } from './lib/tree.js'
import { closure, oursIn } from './lib/closure.js'
import process from 'bare-process'

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))
const writeJson = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f + '.tmp', JSON.stringify(v, null, 2) + '\n'); renameSync(f + '.tmp', f) }
export const manifest = dir => existsSync(join(dir, 'package.json')) ? readJson(join(dir, 'package.json')).pkgm || null : null
// A package's identity: everything in it but its manifest and git (its LICENSE
// included: the package writer puts it in before the hash is taken), its readme
// last. The package writer records it; a copy is checked against it.
export const packageHash = dir => hashTree(dir, [...readdirSync(dir).filter(n => !['package.json', 'README.md', '.git'].includes(n)).sort(), ...(existsSync(join(dir, 'README.md')) ? ['README.md'] : [])])
export function verify (dir) {
  const recorded = manifest(dir)?.hash
  if (!recorded) return { ok: false, said: 'no hash recorded (no package.json with pkgm.hash)' }
  const hash = packageHash(dir)
  return hash === recorded ? { ok: true, hash, said: `intact (${hash.slice(0, 12)})` } : { ok: false, hash, recorded, said: `changed since it was written: its hash ${hash.slice(0, 12)}, written ${recorded.slice(0, 12)}` }
}
export const contentsOf = dir => existsSync(join(dir, 'contents.json')) ? readJson(join(dir, 'contents.json')) : null

// ---- a swarm's codebase into its master's package repository -------------

export function assemble ({ from, swarm, into, log = () => {} }) {
  from = resolve(from); into = resolve(into)
  const m = manifest(from)
  if (!m) throw new Error(`${from}: not a package (no package.json with pkgm)`)
  const list = join(from, 'swarms', swarm, 'modules.json')
  if (!existsSync(list)) throw new Error(`${basename(from)} has no swarm ${swarm} (swarms/${swarm}/modules.json)`)
  const start = readJson(list).modules || []
  const modules = join(from, 'modules')
  const ours = oursIn(modules)
  const set = closure({ ours, third: join(modules, 'node_modules'), start })
  const lost = set.missing.filter(x => x.from === '(start)')
  if (lost.length) throw new Error(`${basename(from)}: swarms/${swarm}/modules.json names what the package does not hold: ${lost.map(x => x.name).join(', ')}`)
  const stage = `${into}.assembling`
  remove(stage)
  const byPath = new Map([...ours.values()].map(o => [o.path, o]))
  for (const p of set.ours) copy(byPath.get(p).dir, join(stage, 'modules', p))
  for (const t of set.third) copy(join(modules, 'node_modules', t), join(stage, 'modules', 'node_modules', t))
  for (const [n, o] of ours) {
    if (!set.ours.includes(o.path)) continue
    const link = join(stage, 'modules', 'node_modules', n)
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(relative(dirname(link), join(stage, 'modules', o.path)), link)
  }
  if (existsSync(join(modules, 'third-party.json'))) {
    const rec = readJson(join(modules, 'third-party.json'))
    writeJson(join(stage, 'modules', 'third-party.json'), { ...rec, modules: rec.modules.filter(r => set.third.includes(r.name)) })
  }
  const hash = hashTree(stage, ['modules'])
  const was = contentsOf(into)
  writeJson(join(stage, 'contents.json'), {
    package: { name: readJson(join(from, 'package.json')).name, hash: m.hash, from },
    swarm,
    modules: { ours: set.ours, third: set.third },
    hash,
    assembled: new Date().toISOString()
  })
  remove(into)
  mkdirSync(dirname(into), { recursive: true })
  renameSync(stage, into)
  const r = { swarm, ours: set.ours.length, third: set.third.length, hash, changed: !was || was.hash !== hash, ...(was && was.hash !== hash ? { was: was.hash } : {}) }
  log({ kind: 'assembled', ...r, hash: hash.slice(0, 12) })
  return r
}

// ---- deploying a package --------------------------------------------------

export function deploy ({ from, into, log = () => {} }) {
  from = resolve(from); into = resolve(into)
  const stage = `${into}.deploying`
  remove(stage)
  mkdirSync(dirname(into), { recursive: true })
  // A copy as hard links (no space taken twice; nothing in it is ever edited in place).
  const c = spawnSync('cp', ['-al', from, stage], { stdio: ['ignore', 'pipe', 'pipe'] })
  if (c.status !== 0) { remove(stage); return { ok: false, said: `could not be copied: ${String(c.stderr).trim()}` } }
  remove(join(stage, '.git'))
  const v = verify(stage)
  if (!v.ok) { remove(stage); return { ok: false, said: v.said } }
  const set = existsSync(join(stage, 'test', 'validation.json')) ? 'validation' : null
  const t = testPackage(stage, { set, log })
  if (!t.ok) { remove(stage); return { ok: false, said: 'its validation failed', runs: t.runs } }
  remove(into)
  renameSync(stage, into)
  log({ kind: 'deployed', package: basename(into), hash: v.hash.slice(0, 12) })
  return { ok: true, hash: v.hash, said: `deployed: ${v.said}, its validation passed`, runs: t.runs }
}

// ---- tests, within the package, bottom up --------------------------------

const executable = f => { try { return (statSync(f).mode & 0o111) !== 0 && statSync(f).isFile() } catch { return false } }

// A set (test/<set>.json): { description, modules: true|false, swarms: true|false, tests: [...] }.
// Without one: everything that runs in place. A test with a `boot` is booted
// (it needs a work folder: ./haicc boot <repo>/test/<test>): listed, not run here.
export function testSet (dir, set) {
  const f = join(dir, 'test', `${set}.json`)
  if (!existsSync(f)) throw new Error(`${basename(dir)} has no test set ${set} (test/${set}.json)`)
  return readJson(f)
}

export function testPackage (dir, { log = () => {}, env: extra = {}, timeout = 10 * 60 * 1000, set = null } = {}) {
  dir = resolve(dir)
  const chosen = set ? testSet(dir, set) : null
  const booted = []
  const runs = []
  const run = (what, cmd, args, cwd) => {
    const t0 = Date.now()
    // Bare on its PATH (the runtime running this), the package's root said.
    const env = { ...process.env, PKGM_ROOT: dir, ...extra, PATH: `${dirname(process.execPath)}:${process.env.PATH || ''}` }
    // A run that does not end is stopped, and fails: it never holds the rest
    // (coreutils' timeout: Bare's spawnSync has no time limit of its own).
    const r = spawnSync('timeout', ['--signal=KILL', String(timeout / 1000), cmd, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    const stopped = r.status === 124 || r.status === 137 || r.signal === 'SIGKILL'
    const out = String(r.stdout || '') + String(r.stderr || '') + (stopped ? `\nstopped: no end after ${timeout / 1000} s` : '')
    // Counted from its output: brittle's summary (# tests = 3/4 pass), or plain (# tests 4, # pass 3).
    const b = out.match(/^# tests = (\d+)\/(\d+) pass/m)
    const count = k => Number((out.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [])[1] || 0)
    const tests = b ? Number(b[2]) : count('tests')
    const pass = b ? Number(b[1]) : count('pass')
    const ok = r.status === 0 && !stopped
    const result = { what, ok, tests, pass, fail: b ? tests - pass : count('fail'), skipped: count('skipped'), ms: Date.now() - t0, ...(ok ? {} : { output: out.split('\n').slice(-40).join('\n') }) }
    log({ kind: 'tested', ...result, output: undefined })
    runs.push(result)
  }
  // The modules' own: each module's "test" script, in its folder.
  if (!chosen || chosen.modules) for (const o of [...oursIn(join(dir, 'modules')).values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const pj = join(o.dir, 'package.json')
    const script = readJson(pj).scripts?.test
    if (script && existsSync(join(o.dir, 'test'))) run(`modules/${o.path}`, 'sh', ['-c', script], o.dir)
  }
  // The swarms': each executable in swarms/<swarm>/test/, in the swarm's folder.
  const swarms = join(dir, 'swarms')
  if ((!chosen || chosen.swarms) && existsSync(swarms)) for (const s of readdirSync(swarms).sort()) {
    const t = join(swarms, s, 'test')
    if (existsSync(t)) for (const f of readdirSync(t).sort()) if (executable(join(t, f))) run(`swarms/${s}/test/${f}`, join(t, f), [], join(swarms, s))
  }
  // The named tests run in place: test/<test>/test, in its folder.
  const tests = join(dir, 'test')
  const names = chosen ? chosen.tests || [] : existsSync(tests) ? readdirSync(tests).filter(n => statSync(join(tests, n)).isDirectory()).sort() : []
  for (const n of names) {
    if (executable(join(tests, n, 'boot'))) { booted.push(n); continue }
    if (executable(join(tests, n, 'test'))) run(`test/${n}`, join(tests, n, 'test'), [], join(tests, n))
    else runs.push({ what: `test/${n}`, ok: false, tests: 0, pass: 0, fail: 0, skipped: 0, ms: 0, output: `test/${n}: no test or boot script` })
  }
  return { dir, ok: runs.length > 0 && runs.every(r => r.ok), runs, booted }
}

export { walk, copy, hashTree, closure, oursIn }

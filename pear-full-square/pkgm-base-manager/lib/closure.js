// What a set of our modules runs on, all the way down: the modules of ours
// they use (imported by name, or by a relative path into another module),
// and the third-party code they and those use. One algorithm for both
// sides of the airgap: the development tool working a package's set out
// from the development repository, and the package manager working a
// swarm's codebase out from a package. Node's built-ins only.
//   closure({ ours, third, start })
//     ours    Map name -> { path, dir }: our modules (path: <org>/<module>)
//     third   the folder of third-party code (node_modules)
//     start   paths of our modules
//     also    third-party names to carry too (what a package's own tests use: brittle)
//   -> { ours: [path...], third: [name...], missing: [{ from, name }...] }
// Read: every .js/.mjs/.cjs file of a module (its tests included: a module
// is tested within its package), and its package.json's dependencies of
// every kind. A name neither ours nor in `third` is a built-in or missing:
// it is reported, not guessed.
import { readFileSync, readdirSync, existsSync, lstatSync } from 'bare-fs'
import { join, dirname, resolve, relative, sep } from 'bare-path'

const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g
const KINDS = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies']

const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const pkgName = spec => spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]

function sources (dir) {
  const out = []
  const visit = d => {
    for (const n of readdirSync(d)) {
      if (n === 'node_modules' || n === '.git') continue
      const p = join(d, n)
      const st = lstatSync(p)
      if (st.isDirectory()) visit(p)
      else if (/\.(m|c)?js$/.test(n)) out.push(p)
    }
  }
  visit(dir)
  return out
}

export function closure ({ ours, third, start, also = [] }) {
  const byPath = new Map([...ours.values()].map(m => [m.path, m]))
  const dirs = [...ours.values()].map(m => [resolve(m.dir) + sep, m.path])
  const seen = new Set()
  const thirdSeen = new Set()
  const missing = []
  const queue = [...start]
  const addThird = name => { if (!thirdSeen.has(name)) { thirdSeen.add(name); thirdQueue.push(name) } }
  const thirdQueue = []
  for (const n of also) if (existsSync(join(third, n))) addThird(n); else missing.push({ from: '(also)', name: n })
  while (queue.length) {
    const path = queue.shift()
    if (seen.has(path)) continue
    const m = byPath.get(path)
    if (!m) { missing.push({ from: '(start)', name: path }); continue }
    seen.add(path)
    const pj = readJson(join(m.dir, 'package.json')) || {}
    const names = new Set(Object.keys(Object.assign({}, ...KINDS.map(k => pj[k] || {}))))
    // Development dependencies only where they are there (a module's tooling
    // is not its code): never reported missing.
    const optional = new Set(Object.keys(pj.devDependencies || {}))
    for (const f of sources(m.dir)) {
      for (const [, , spec] of readFileSync(f, 'utf8').matchAll(SPEC)) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(spec) || spec.startsWith('/') || spec.includes('${')) continue
        if (spec.startsWith('.')) {
          const target = resolve(dirname(f), spec)
          const hit = dirs.find(([d]) => target.startsWith(d))
          if (hit && hit[1] !== path) queue.push(hit[1])
          continue
        }
        names.add(pkgName(spec))
      }
    }
    for (const name of names) {
      if (ours.has(name)) { queue.push(ours.get(name).path); continue }
      if (existsSync(join(third, name)) && !lstatSync(join(third, name)).isSymbolicLink()) addThird(name)
      else if (!optional.has(name)) missing.push({ from: path, name })
    }
  }
  // Third-party: each package's own dependencies, and those of the packages
  // nested in it, resolved as Node does (nearest node_modules first); what
  // resolves to the top level is added.
  const top = resolve(third)
  while (thirdQueue.length) {
    const name = thirdQueue.shift()
    const pkgs = [join(top, name)]
    for (let i = 0; i < pkgs.length; i++) {
      const nm = join(pkgs[i], 'node_modules')
      if (existsSync(nm)) for (const n of readdirSync(nm)) {
        if (n.startsWith('.')) continue
        for (const s of n.startsWith('@') ? readdirSync(join(nm, n)).map(x => `${n}/${x}`) : [n]) if (existsSync(join(nm, s, 'package.json'))) pkgs.push(join(nm, s))
      }
    }
    for (const p of pkgs) {
      const pj = readJson(join(p, 'package.json')) || {}
      for (const dep of Object.keys(Object.assign({}, pj.dependencies, pj.optionalDependencies, pj.peerDependencies))) {
        // Nearest first: inside this package's own nesting, then the top.
        let d = p; let carried = false
        for (;;) {
          if (existsSync(join(d, 'node_modules', dep))) { carried = true; break }
          const rel = relative(top, d).split(sep).join('/')
          const i = rel.lastIndexOf('/node_modules/')
          if (i < 0) break
          d = join(top, rel.slice(0, i))
        }
        if (carried) continue
        if (existsSync(join(top, dep))) addThird(dep)
        else if (!pj.optionalDependencies?.[dep] && !pj.peerDependencies?.[dep]) missing.push({ from: name, name: dep })
      }
    }
  }
  return { ours: [...seen].sort(), third: [...thirdSeen].sort(), missing }
}

// Our modules in a package's (or a repository's) modules/: <org>/<module>
// folders with a package.json, by the name they are imported by.
export function oursIn (modulesDir) {
  const ours = new Map()
  if (!existsSync(modulesDir)) return ours
  for (const org of readdirSync(modulesDir)) {
    if (org === 'node_modules' || !lstatSync(join(modulesDir, org)).isDirectory()) continue
    for (const mod of readdirSync(join(modulesDir, org))) {
      const pj = readJson(join(modulesDir, org, mod, 'package.json'))
      if (pj) ours.set(pj.name || mod, { path: `${org}/${mod}`, dir: join(modulesDir, org, mod) })
    }
  }
  return ours
}

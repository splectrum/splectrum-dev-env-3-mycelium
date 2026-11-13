// rules: the code rules on a module of ours, or on a package's own code
// (README.md beside it). Mechanical: structure, imports, references.
import { readFileSync, readdirSync, statSync, existsSync } from 'bare-fs'
import { join, dirname, resolve, relative, sep } from 'bare-path'

const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g
const TRANSIENT = /(?<![\w/-])(docs\/(design|guides|rules)|steps\/\d)[\w./-]*/g

// The .js files of a folder, its node_modules aside.
export function jsFiles (dir) {
  const out = []
  for (const n of readdirSync(dir).sort()) {
    if (n === 'node_modules' || n.startsWith('.')) continue
    const p = join(dir, n)
    if (statSync(p).isDirectory()) out.push(...jsFiles(p))
    else if (/\.(c|m)?js$/.test(n)) out.push(p)
  }
  return out
}

// The rules on one module of ours, its folder: [{ file, check, detail }].
//   ours   our modules' names (imported by name, never into their files)
export function checkModule (dir, { ours = [] } = {}) {
  const problems = []
  const at = (file, check, detail) => problems.push({ file: relative(dir, file).split(sep).join('/') || '.', check, detail })
  // structure: a method directory, its code and its README
  for (const group of ['external', 'internal']) {
    const g = join(dir, group)
    if (!existsSync(g)) continue
    for (const n of readdirSync(g).sort()) {
      const m = join(g, n)
      if (!statSync(m).isDirectory()) continue
      for (const f of ['index.js', 'README.md']) if (!existsSync(join(m, f))) at(m, 'structure', `${group}/${n}: no ${f}`)
    }
  }
  for (const file of jsFiles(dir)) {
    const text = readFileSync(file, 'utf8')
    for (const [, , spec] of text.matchAll(SPEC)) {
      if (spec.startsWith('.')) {
        const target = resolve(dirname(file), spec)
        if (!(target + sep).startsWith(resolve(dir) + sep)) at(file, 'imports', `${spec}: out of the module (import it by name)`)
        continue
      }
      const [first, second] = spec.split('/')
      const name = first.startsWith('@') ? `${first}/${second}` : first
      // a test may share another module's test helpers, by name: <module>/test/...
      const sharing = relative(dir, file).split(sep)[0] === 'test' && spec.startsWith(`${name}/test/`)
      if (ours.includes(name) && spec !== name && !sharing) at(file, 'imports', `${spec}: into another module's files (import ${name})`)
    }
    const refs = [...new Set(text.match(TRANSIENT) ?? [])]
    if (refs.length) at(file, 'transient', refs.join(', '))
  }
  return problems
}

// The rules on a package's own code (its entry points, its test runners):
// references only; it reaches its modules by path, as it must.
export function checkPackage (dir) {
  const problems = []
  for (const file of jsFiles(dir).filter(f => !relative(dir, f).startsWith('modules'))) {
    const refs = [...new Set(readFileSync(file, 'utf8').match(TRANSIENT) ?? [])]
    if (refs.length) problems.push({ file: relative(dir, file).split(sep).join('/'), check: 'transient', detail: refs.join(', ') })
  }
  return problems
}

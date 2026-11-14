// package: a package against the structure it is to have: its files, its
// test sets, its tests, and the tests of its own it must have by what it
// provides (README.md beside it). Each -> [{ check, detail }].
import { readFileSync, readdirSync, statSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { pathToFileURL } from 'bare-url'

// The generic tests, every package's, a folder each in its test/, the same
// in every package (they come with the package template).
export const GENERIC = ['help', 'code', 'mrepo', 'package', 'modules', 'help-in-situ', 'mrepo-in-situ']
// The sets every package has, and the generic tests each holds.
export const SETS = {
  validate: ['help', 'code', 'mrepo', 'package'],
  'validate-in-situ': ['help-in-situ', 'mrepo-in-situ'],
  full: ['help', 'code', 'mrepo', 'package']
}

// The package template: every other package is pinned to a commit of it.
export const TEMPLATE = 'package-docs-template'

const json = f => JSON.parse(readFileSync(f, 'utf8'))
const dirs = d => existsSync(d) ? readdirSync(d).sort().filter(n => statSync(join(d, n)).isDirectory()) : []

// What a package provides, read from its files: the protocols of its
// protocol.js (null: it could not be loaded), a program (run.js), hooks,
// an mrepo of its own (a list of packages); whether it is the package
// template, or a documentation package.
export async function provides (pkg) {
  const pj = existsSync(join(pkg, 'package.json')) ? json(join(pkg, 'package.json')) : {}
  let protocols = []
  if (existsSync(join(pkg, 'protocol.js'))) {
    try { protocols = Object.keys((await import(pathToFileURL(join(pkg, 'protocol.js')).href)).protocols ?? {}).sort() } catch { protocols = null }
  }
  return {
    template: pj.name === TEMPLATE,
    docs: pj.docs === true,
    protocols,
    run: existsSync(join(pkg, 'run.js')),
    hooks: existsSync(join(pkg, 'mrepo', 'runtime', 'hooks')),
    list: existsSync(join(pkg, 'mrepo', 'packages', 'layer.json')),
    modules: dirs(join(pkg, 'modules')).some(n => n !== 'node_modules')
  }
}

// Its test folders: every folder of test/, by name; and those of its own,
// the ones that are not a generic test's.
export const testFolders = pkg => dirs(join(pkg, 'test'))
export const ownTests = pkg => testFolders(pkg).filter(n => !GENERIC.includes(n))

// Its files: a README and a LICENSE; the folder its test report goes in;
// its package.json's description, license and type; the modules it starts
// from, a list; its pin to the package template.
export function checkFiles (pkg) {
  const out = []
  const at = detail => out.push({ check: 'package', detail })
  for (const f of ['README.md', 'LICENSE', 'package.json']) if (!existsSync(join(pkg, f))) at(`${f}: not there`)
  // where its test report goes (the report itself is its pre-release's)
  if (!existsSync(join(pkg, 'test-reports', 'README.md'))) at('test-reports/: not there, or without its README.md')
  if (!existsSync(join(pkg, 'package.json'))) return out
  let pj = null
  try { pj = json(join(pkg, 'package.json')) } catch (err) { at(`package.json: ${err.message}`); return out }
  if (!pj.description) at('package.json: no description')
  if (!pj.license) at('package.json: no license')
  if (pj.type !== 'module') at(`package.json: type ${pj.type} (module)`)
  if (!Array.isArray(pj.modules)) at('package.json: modules, the list of our modules it starts from')
  // its pin: the commit of the package template it was brought to (the
  // template itself has none)
  if (pj.name !== TEMPLATE && !/^[0-9a-f]{40}$/.test(pj.template?.commit ?? '')) at('package.json: template, the commit of the package template it was brought to')
  return out
}

// Its sets: validate, validate-in-situ and full, each a description and
// its tests by name; every test named has its folder, test/<name>/, the
// generic ones too; the generic ones in the sets they belong to (full:
// modules too, where it carries modules).
export function checkSets (pkg, what) {
  const out = []
  const at = detail => out.push({ check: 'package', detail })
  const folders = testFolders(pkg)
  const missing = new Set() // a test without its folder: said once, whatever the sets naming it
  for (const [name, generic] of Object.entries(SETS)) {
    const file = join(pkg, 'test', `${name}.json`)
    if (!existsSync(file)) { at(`test/${name}.json: not there`); continue }
    let set = null
    try { set = json(file) } catch (err) { at(`test/${name}.json: ${err.message}`); continue }
    if (!set.description) at(`test/${name}.json: no description`)
    if (!Array.isArray(set.tests)) { at(`test/${name}.json: tests, a list of names`); continue }
    for (const t of set.tests) if (!folders.includes(t)) missing.add(t)
    const wanted = name === 'full' && what.modules ? [...generic, 'modules'] : generic
    for (const g of wanted) if (!set.tests.includes(g)) at(`test/${name}.json: ${g} is not in it`)
  }
  for (const t of [...missing].sort()) at(`the ${t} test: no folder (test/${t}/)`)
  return out
}

// Its tests: each a folder with its run.js and its README, the generic
// ones too; one of its own also with a test file, and named in validate
// and in full. And at least one test of its own: what is specific to the
// package tested there; where nothing is, a dummy that says so, running
// nothing (0 of 0): an explicit decision, written for the package, never
// part of the template. The template itself is asked for none: its folder
// documenting one is left alone.
export function checkTests (pkg, what) {
  const out = []
  const at = detail => out.push({ check: 'package', detail })
  const own = what.template ? [] : ownTests(pkg)
  const inSet = name => { try { return json(join(pkg, 'test', `${name}.json`)).tests ?? [] } catch { return [] } }
  for (const t of [...testFolders(pkg).filter(n => GENERIC.includes(n)), ...own]) {
    const dir = join(pkg, 'test', t)
    if (!existsSync(join(dir, 'run.js'))) at(`test/${t}: no run.js`)
    if (!existsSync(join(dir, 'README.md'))) at(`test/${t}: no README.md`)
  }
  for (const t of own) {
    if (!readdirSync(join(pkg, 'test', t)).some(n => n.endsWith('.test.js'))) at(`test/${t}: no test file (*.test.js)`)
    for (const s of ['validate', 'full']) if (!inSet(s).includes(t)) at(`test/${t}: not in the ${s} set`)
  }
  if (what.protocols === null) at('protocol.js: could not be loaded, its protocols unknown')
  if (what.template || own.length) return out
  const brings = [...(what.protocols ?? []).map(p => `the ${p} protocol`), what.run && 'a program (run.js)', what.hooks && 'hooks', what.list && 'an mrepo of its own (its list of packages)'].filter(Boolean)
  at(brings.length
    ? `it provides ${brings.join(', ')}: no test of its own`
    : 'no test of its own: what is specific to the package, or a dummy that says nothing is (an explicit decision)')
  return out
}

// All of it.
export async function checkOwn (pkg) {
  const what = await provides(pkg)
  return [...checkFiles(pkg), ...checkSets(pkg, what), ...checkTests(pkg, what)]
}

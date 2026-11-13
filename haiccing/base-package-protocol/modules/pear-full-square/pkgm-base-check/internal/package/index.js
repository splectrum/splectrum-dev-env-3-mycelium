// package: a package against the structure it is to have: its files, its
// test sets, its tests, and the tests of its own it must have by what it
// provides (README.md beside it). Each -> [{ check, detail }].
import { readFileSync, readdirSync, statSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { pathToFileURL } from 'bare-url'

// The generic tests, every package's: nothing of them is in its test/ folder.
export const GENERIC = ['help', 'code', 'mrepo', 'package', 'modules', 'help-in-situ', 'mrepo-in-situ']
// The sets every package has, and the generic tests each holds.
export const SETS = {
  validate: ['help', 'code', 'mrepo', 'package'],
  'validate-in-situ': ['help-in-situ', 'mrepo-in-situ'],
  full: ['help', 'code', 'mrepo', 'package']
}

const json = f => JSON.parse(readFileSync(f, 'utf8'))
const dirs = d => existsSync(d) ? readdirSync(d).sort().filter(n => statSync(join(d, n)).isDirectory()) : []

// What a package provides, read from its files: the protocols of its
// protocol.js (null: it could not be loaded), a program (run.js), hooks,
// an mrepo of its own (a list of packages); a documentation package
// provides none of them.
export async function provides (pkg) {
  const pj = existsSync(join(pkg, 'package.json')) ? json(join(pkg, 'package.json')) : {}
  let protocols = []
  if (existsSync(join(pkg, 'protocol.js'))) {
    try { protocols = Object.keys((await import(pathToFileURL(join(pkg, 'protocol.js')).href)).protocols ?? {}).sort() } catch { protocols = null }
  }
  return {
    docs: pj.docs === true,
    protocols,
    run: existsSync(join(pkg, 'run.js')),
    hooks: existsSync(join(pkg, 'mrepo', 'runtime', 'hooks')),
    list: existsSync(join(pkg, 'mrepo', 'packages', 'layer.json')),
    modules: dirs(join(pkg, 'modules')).some(n => n !== 'node_modules')
  }
}

// Its tests of its own: the folders of test/, by name.
export const ownTests = pkg => dirs(join(pkg, 'test'))

// Its files: a README and a LICENSE; its package.json's description,
// license and type; the modules it starts from, a list.
export function checkFiles (pkg) {
  const out = []
  const at = detail => out.push({ check: 'package', detail })
  for (const f of ['README.md', 'LICENSE', 'package.json']) if (!existsSync(join(pkg, f))) at(`${f}: not there`)
  if (!existsSync(join(pkg, 'package.json'))) return out
  let pj = null
  try { pj = json(join(pkg, 'package.json')) } catch (err) { at(`package.json: ${err.message}`); return out }
  if (!pj.description) at('package.json: no description')
  if (!pj.license) at('package.json: no license')
  if (pj.type !== 'module') at(`package.json: type ${pj.type} (module)`)
  if (!Array.isArray(pj.modules)) at('package.json: modules, the list of our modules it starts from')
  return out
}

// Its sets: validate, validate-in-situ and full, each a description and
// its tests by name; every name a test of its own or a generic one; the
// generic ones in the sets they belong to (full: modules too, where it
// carries modules and is not a documentation package).
export function checkSets (pkg, what) {
  const out = []
  const at = detail => out.push({ check: 'package', detail })
  const own = what.docs ? [] : ownTests(pkg)
  for (const [name, generic] of Object.entries(SETS)) {
    const file = join(pkg, 'test', `${name}.json`)
    if (!existsSync(file)) { at(`test/${name}.json: not there`); continue }
    let set = null
    try { set = json(file) } catch (err) { at(`test/${name}.json: ${err.message}`); continue }
    if (!set.description) at(`test/${name}.json: no description`)
    if (!Array.isArray(set.tests)) { at(`test/${name}.json: tests, a list of names`); continue }
    for (const t of set.tests) if (!GENERIC.includes(t) && !own.includes(t)) at(`test/${name}.json: ${t}, no such test`)
    const wanted = name === 'full' && what.modules && !what.docs ? [...generic, 'modules'] : generic
    for (const g of wanted) if (!set.tests.includes(g)) at(`test/${name}.json: ${g} is not in it`)
  }
  return out
}

// The test of a protocol, by the protocol's name: test/protocol-<name>/
// (the prefix keeps it apart from the generic tests: help is one of them).
export const protocolTest = name => `protocol-${name}`

// Its tests of its own: each a unit (its run.js, its README, a test file),
// in validate and in full, none under a generic test's name; and those it
// must have, by what it provides: a test for each protocol; at least one
// where it has a program, hooks or an mrepo of its own. A documentation
// package: none asked.
export function checkTests (pkg, what) {
  const out = []
  const at = detail => out.push({ check: 'package', detail })
  if (what.docs) return out
  const own = ownTests(pkg)
  const inSet = name => { try { return json(join(pkg, 'test', `${name}.json`)).tests ?? [] } catch { return [] } }
  for (const t of own) {
    const dir = join(pkg, 'test', t)
    if (GENERIC.includes(t)) at(`test/${t}: a generic test's name`)
    if (!existsSync(join(dir, 'run.js'))) at(`test/${t}: no run.js`)
    if (!existsSync(join(dir, 'README.md'))) at(`test/${t}: no README.md`)
    if (!readdirSync(dir).some(n => n.endsWith('.test.js'))) at(`test/${t}: no test file (*.test.js)`)
    for (const s of ['validate', 'full']) if (!inSet(s).includes(t)) at(`test/${t}: not in the ${s} set`)
  }
  if (what.protocols === null) at('protocol.js: could not be loaded, its protocols unknown')
  for (const p of what.protocols ?? []) if (!own.includes(protocolTest(p))) at(`the ${p} protocol: no test of its own (test/${protocolTest(p)}/)`)
  const brings = [what.run && 'a program (run.js)', what.hooks && 'hooks', what.list && 'an mrepo of its own (its list of packages)'].filter(Boolean)
  if (brings.length && !own.length) at(`${brings.join(', ')}: no test of its own`)
  return out
}

// All of it.
export async function checkOwn (pkg) {
  const what = await provides(pkg)
  return [...checkFiles(pkg), ...checkSets(pkg, what), ...checkTests(pkg, what)]
}

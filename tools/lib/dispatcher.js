// A package's dispatcher and its test runner, written into the package's
// folder (generated, committed; tools/package-assemble.js and
// tools/package-bundle.js write them, the same from the same package):
//   main.js       the bundle's main: run(target, { dryRun }) for every entry,
//                 by path: /run, /protocol, /deploy, the tests (/test/<name>,
//                 /test/modules, /test/modules/<org>/<module>, the sets
//                 /test/<set>); every one named in its code, so bare-pack
//                 packs it
//   test/run.js   a test set's command line: bare test/run.js [<set>], through
//                 main.js (each unit its own process, bare <package> /test/...,
//                 its results read from brittle's summary)
// docs: haiccing/package-docs-template (test/README.md).
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'bare-fs'
import { join, dirname } from 'bare-path'

const ENTRIES = ['run', 'protocol', 'deploy']
const q = s => JSON.stringify(s)

// The test units: the package's own tests (test/<name>/run.js) and each
// carried module's unit tests (modules/<org>/<module>/test/*.test.js).
function unitsOf (folder) {
  const units = {}
  const test = join(folder, 'test')
  if (existsSync(test)) {
    for (const n of readdirSync(test).sort()) {
      if (existsSync(join(test, n, 'run.js'))) units[`/test/${n}`] = [`./test/${n}/run.js`]
    }
  }
  // The help tests, every package that carries mrepo-base-help: its help
  // extracted from its own files (/test/help), or as a running mrepo's
  // runtime extracted it (/test/help-in-situ: MREPO, PACKAGE).
  const validate = join(folder, 'modules', 'pear-full-square', 'mrepo-base-help', 'validate')
  for (const n of ['help', 'help-in-situ']) if (existsSync(join(validate, `${n}.test.js`))) units[`/test/${n}`] = [`./modules/pear-full-square/mrepo-base-help/validate/${n}.test.js`]
  // The code test, every package that carries pkgm-base-check: its modules
  // and its own code against the code rules (/test/code).
  if (existsSync(join(folder, 'modules', 'pear-full-square', 'pkgm-base-check', 'validate', 'code.test.js'))) units['/test/code'] = ['./modules/pear-full-square/pkgm-base-check/validate/code.test.js']
  const modules = join(folder, 'modules')
  if (existsSync(modules)) {
    for (const org of readdirSync(modules).filter(n => n !== 'node_modules' && statSync(join(modules, n)).isDirectory()).sort()) {
      for (const mod of readdirSync(join(modules, org)).sort()) {
        const t = join(modules, org, mod, 'test')
        const files = existsSync(t) ? readdirSync(t).filter(n => n.endsWith('.test.js')).sort() : []
        if (files.length) units[`/test/modules/${org}/${mod}`] = files.map(f => `./modules/${org}/${mod}/test/${f}`)
      }
    }
  }
  return units
}

// The sets: test/<set>.json, { description, tests: [<name>...] }.
function setsOf (folder) {
  const test = join(folder, 'test')
  const sets = {}
  if (existsSync(test)) {
    for (const n of readdirSync(test).filter(n => n.endsWith('.json')).sort()) {
      const s = JSON.parse(readFileSync(join(test, n), 'utf8'))
      if (Array.isArray(s.tests)) sets[`/test/${n.slice(0, -5)}`] = s.tests
    }
  }
  return sets
}

function main (folder) {
  const entries = ENTRIES.filter(e => existsSync(join(folder, `${e}.js`)))
  const units = unitsOf(folder)
  const sets = setsOf(folder)
  const L = []
  L.push(
    '// The package\'s dispatcher, its bundle\'s main (generated: tools/lib/dispatcher.js).',
    '// run(target, { dryRun }): every entry, by path. Started as the program',
    '// (bare <package>.bundle [target] ..., or bare main.js from its folder):',
    '// the target (a known path; else /run, every argument run.js\'s). Imported:',
    '// nothing runs. Docs: haiccing/package-docs-template, test/README.md.',
    "import os from './modules/node_modules/bare-os/index.js'",
    "import { URL } from './modules/node_modules/bare-url/index.js'",
    "import { spawn } from './modules/node_modules/bare-subprocess/index.js'",
    '',
    '// The entry points.',
    'const ENTRIES = {',
    ...entries.map(e => `  ${q('/' + e)}: () => import(${q('./' + e + '.js')}),`),
    '}',
    '// The test units, each run in one process: the package\'s tests, each',
    '// carried module\'s unit tests.',
    'const UNITS = {',
    ...Object.entries(units).map(([k, files]) => `  ${q(k)}: () => Promise.all([${files.map(f => `import(${q(f)})`).join(', ')}]),`),
    '}',
    '// The test sets: their tests by name (modules: every module\'s unit tests).',
    `const SETS = ${JSON.stringify(sets)}`,
    '',
    '// What a target runs: its units (a set, /test/modules, a unit); null: none.',
    'export function expand (target) {',
    "  if (UNITS[target]) return [target]",
    "  if (target === '/test/modules') return Object.keys(UNITS).filter(u => u.startsWith('/test/modules/'))",
    "  if (SETS[target]) return SETS[target].flatMap(n => expand(`/test/${n}`) ?? [])",
    '  return null',
    '}',
    '',
    '// The program to start a unit with: this bundle, else this main.js (its folder).',
    "const bundle = import.meta.url.includes('.bundle/') ? import.meta.url.slice(0, import.meta.url.indexOf('.bundle/') + '.bundle'.length) : null",
    "export const self = new URL(bundle ?? import.meta.url).pathname",
    '',
    'export async function run (target = \'/run\', { dryRun = false, print = null, env = null } = {}) {',
    "  if (target === '/') {",
    "    const all = [...Object.keys(ENTRIES), ...Object.keys(SETS), ...(Object.keys(UNITS).some(u => u.startsWith('/test/modules/')) ? ['/test/modules'] : []), ...Object.keys(UNITS)]",
    "    if (dryRun) return all",
    "    throw new Error('/ is not run: name an entry (a dry run lists them)')",
    '  }',
    '  if (ENTRIES[target]) return dryRun ? [target] : ENTRIES[target]()',
    '  const units = expand(target)',
    "  if (!units) throw new Error(`no such entry: ${target}`)",
    '  if (dryRun) return units',
    '  return runUnits(target, units, { print, env })',
    '}',
    '',
    "// brittle's summary: '# tests = a/b pass', '# asserts = c/d pass'; a failed",
    "// test: 'not ok n - name' at the top level.",
    'export function summary (tap) {',
    '  const count = re => { const m = tap.match(re); return m ? { passed: Number(m[1]), total: Number(m[2]) } : null }',
    "  const failures = tap.split('\\n').filter(l => /^not ok \\d+/.test(l)).map(l => l.replace(/^not ok \\d+ - /, '').replace(/ # time = .*$/, ''))",
    '  return { tests: count(/^# tests = (\\d+)\\/(\\d+)/m), asserts: count(/^# asserts = (\\d+)\\/(\\d+)/m), failures }',
    '}',
    '',
    '// The units, each its own process (bare <program> <unit>), in order: the',
    "// result { target, ok, units: [{ unit, ok, tests, asserts, failures }] }.",
    '// A floating instance: from a bundle, the package expanded into a temporary',
    "// folder (its files; each native addon put back where require.addon looks,",
    "// from the addons beside the bundle; the links to our modules by name), its",
    '// main.js the program the units run with; removed after. From the',
    '// package\'s folder: none needed.',
    'export async function instantiate () {',
    '  if (!bundle) return { program: self, remove: () => {} }',
    "  const fs = await import('./modules/node_modules/bare-fs/index.js')",
    "  const { default: Bundle } = await import('./modules/node_modules/bare-bundle/index.js')",
    "  const path = await import('./modules/node_modules/bare-path/index.js')",
    '  const file = new URL(bundle).pathname',
    '  const b = Bundle.from(fs.readFileSync(file))',
    "  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'package-'))",
    '  for (const key of Object.keys(b.files)) {',
    '    fs.mkdirSync(path.dirname(path.join(dir, key)), { recursive: true })',
    '    fs.writeFileSync(path.join(dir, key), b.read(key))',
    '  }',
    "  const platform = `${os.platform()}-${os.arch()}`",
    '  for (const [from, map] of Object.entries(b.resolutions)) {',
    '    for (const to of Object.values(map)) {',
    "      if (!to?.addon || !from.startsWith('/modules/node_modules/')) continue",
    "      const parts = from.slice('/modules/node_modules/'.length).split('/')",
    "      const pkg = parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]",
    "      const name = JSON.parse(b.read(`/modules/node_modules/${pkg}/package.json`)).name.replace('/', '+')",
    "      const target = path.join(dir, 'modules', 'node_modules', pkg, 'prebuilds', platform, `${name}.bare`)",
    '      fs.mkdirSync(path.dirname(target), { recursive: true })',
    "      fs.copyFileSync(path.join(path.dirname(file), to.addon.replace(/^\\/\\.\\.\\//, '')), target)",
    '    }',
    '  }',
    "  const mods = path.join(dir, 'modules')",
    "  for (const org of fs.readdirSync(mods).filter(n => n !== 'node_modules')) {",
    '    if (!fs.statSync(path.join(mods, org)).isDirectory()) continue',
    '    for (const mod of fs.readdirSync(path.join(mods, org))) {',
    "      const pj = path.join(mods, org, mod, 'package.json')",
    '      if (!fs.existsSync(pj)) continue',
    "      const link = path.join(mods, 'node_modules', JSON.parse(fs.readFileSync(pj, 'utf8')).name)",
    '      if (!fs.existsSync(link)) { fs.mkdirSync(path.dirname(link), { recursive: true }); fs.symlinkSync(path.relative(path.dirname(link), path.join(mods, org, mod)), link) }',
    '    }',
    '  }',
    "  return { program: path.join(dir, 'main.js'), remove: () => fs.rmSync(dir, { recursive: true, force: true }) }",
    '}',
    '',
    '// env: added to each unit\'s environment (runtime run: MREPO, the mrepo\'s',
    '// directory, and PACKAGE, for the in-situ tests).',
    'export async function runUnits (target, units, { program = null, print = null, env = null } = {}) {',
    '  const instance = program ? { program, remove: () => {} } : await instantiate()',
    '  try { return await runEach(target, units, instance.program, print, env) } finally { instance.remove() }',
    '}',
    '',
    'async function runEach (target, units, program, print, extra) {',
    '  const env = extra ? { ...Object.fromEntries(os.getEnvKeys().map(k => [k, os.getEnv(k)])), ...extra } : undefined',
    '  const results = []',
    '  for (const u of units) {',
    '    if (print) print(`# ${u}`)',
    '    results.push(await new Promise(resolve => {',
    "      const child = spawn(os.execPath(), [program, u], { stdio: ['ignore', 'pipe', 'pipe'], ...(env ? { env } : {}) })",
    "      let out = ''",
    "      child.stdout.on('data', d => { out += d; if (print) for (const l of d.toString().split('\\n')) if (l) print(l) })",
    "      child.stderr.on('data', d => { out += d })",
    "      child.on('exit', code => { const s = summary(out); resolve({ unit: u, ok: code === 0 && !s.failures.length, ...s }) })",
    '    }))',
    '  }',
    '  return { target, ok: results.every(r => r.ok), units: results }',
    '}',
    '',
    '// Started as the program: this bundle, or this main.js, is what Bare was started with.',
    "const started = Bare.argv[1] ? new URL(Bare.argv[1], `file://${os.cwd()}/`).href : null",
    "if (started && (started === (bundle ?? import.meta.url))) {",
    '  const target = Bare.argv[2]',
    "  if (target && UNITS[target]) await UNITS[target]() // a unit: its tests here, brittle's report, its exit code",
    "  else if (target && (target === '/' || expand(target) || ENTRIES[target] && target !== '/run')) {",
    "    const dryRun = Bare.argv.includes('--dry-run')",
    '    const r = await run(target, { dryRun, print: line => console.log(line) })',
    "    if (dryRun || target === '/protocol' || target === '/deploy') console.log(JSON.stringify(dryRun ? r : Object.keys(r)))",
    '    else { console.log(JSON.stringify(r)); Bare.exitCode = r.ok ? 0 : 1 }',
    "  } else if (ENTRIES['/run']) await run('/run')",
    '}',
    ''
  )
  return L.join('\n')
}

const RUNNER = `// The package's test runner (generated: tools/lib/dispatcher.js; docs:
// haiccing/package-docs-template, test/README.md). A test set, from this
// point the whole lifecycle, through the package's dispatcher (main.js:
// each unit its own process, its results read from brittle's summary).
//   bare test/run.js [<set>]   a set (validate by default): each unit's report
//       shown, the result last (one line), exit 0 passed, 1 failed, 2 no such set
import process from '../modules/node_modules/bare-process/index.js'
import { run } from '../main.js'

const set = process.argv.slice(2).find(a => !a.startsWith('-')) ?? 'validate'
let r
try { r = await run(\`/test/\${set}\`, { print: line => console.log(line) }) } catch (err) { console.error(err.message); process.exit(2) }
console.log(JSON.stringify(r))
process.exit(r.ok ? 0 : 1)
`

// A package with nothing to dispatch: no entry point, no modules to run its
// tests with; its
// files read from its bundle (its READMEs, into an mrepo's help layer).
const DOCS = [
  '// A documentation package\'s main (generated: tools/lib/dispatcher.js): no',
  '// entry point, nothing to run; its files are read from its bundle.',
  'export async function run (target = \'/run\', { dryRun = false } = {}) {',
  "  if (target === '/' && dryRun) return []",
  '  throw new Error(`no such entry: ${target} (a documentation package: nothing to run)`)',
  '}',
  ''
].join('\n')

export function writeDispatcher (folder) {
  if (!ENTRIES.some(e => existsSync(join(folder, `${e}.js`))) && !existsSync(join(folder, 'modules', 'node_modules'))) {
    writeFileSync(join(folder, 'main.js'), DOCS)
    return
  }
  writeFileSync(join(folder, 'main.js'), main(folder))
  mkdirSync(join(folder, 'test'), { recursive: true })
  writeFileSync(join(folder, 'test', 'run.js'), RUNNER)
}

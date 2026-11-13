// The package check on packages written here: well formed ones, and one
// that breaks each rule.
import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { checkOwn, provides, ownTests } from '../index.js'

function write (dir, files) { for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), typeof t === 'string' ? t : JSON.stringify(t)) } }
const within = async (files, fn) => { const d = mkdtempSync(join(tmpdir(), 'package-')); try { write(d, files); return await fn(d) } finally { rmSync(d, { recursive: true, force: true }) } }
const details = async d => (await checkOwn(d)).map(p => p.detail).sort()

const sets = (own = [], modules = true) => ({
  'test/validate.json': { description: 'On its own.', tests: [...own, 'help', 'code', 'mrepo', 'package'] },
  'test/validate-in-situ.json': { description: 'Where it is deployed.', tests: ['help-in-situ', 'mrepo-in-situ'] },
  'test/full.json': { description: 'Every test.', tests: [...own, 'help', 'code', 'mrepo', 'package', ...(modules ? ['modules'] : [])] }
})
const unit = name => ({ [`test/${name}/run.js`]: '', [`test/${name}/README.md`]: `# ${name}\n`, [`test/${name}/${name}.test.js`]: '' })
const base = {
  'README.md': '# p\n',
  LICENSE: 'MIT\n',
  'package.json': { name: 'p', description: 'Package: p.', license: 'MIT', type: 'module', main: 'main.js', modules: ['org/m'] },
  'modules/org/m/package.json': { name: 'm' }
}
const PROTOCOL = 'export const protocols = { p: { actions: { a: {} } }, q: { actions: {} } }\nexport const actions = {}\n'

test('a protocol package with a test for each protocol: none', async (t) => {
  await within({ ...base, 'protocol.js': PROTOCOL, ...sets(['protocol-p', 'protocol-q']), ...unit('protocol-p'), ...unit('protocol-q') }, async d => {
    t.alike(await provides(d), { docs: false, protocols: ['p', 'q'], run: false, hooks: false, list: false, modules: true }, 'what it provides, read from its files')
    t.alike(ownTests(d), ['protocol-p', 'protocol-q'], 'its tests of its own')
    t.alike(await details(d), [])
  })
})

test('it tests what it provides: a protocol without its test; a program, hooks, a list without any', async (t) => {
  await within({ ...base, 'protocol.js': PROTOCOL, ...sets(['protocol-p']), ...unit('protocol-p') }, async d => {
    t.alike(await details(d), ['the q protocol: no test of its own (test/protocol-q/)'], 'one protocol tested, the other not: said')
  })
  await within({ ...base, 'run.js': '', 'mrepo/runtime/hooks/boot/x.json': ['a/b'], 'mrepo/packages/layer.json': { packages: ['org/p'] }, ...sets() }, async d => {
    t.alike(await details(d), ['a program (run.js), hooks, an mrepo of its own (its list of packages): no test of its own'], 'what it brings named')
  })
  await within({ ...base, 'run.js': '', ...sets(['start']), ...unit('start') }, async d => {
    t.alike(await details(d), [], 'a program with a test of its own, whatever its name: none')
  })
  await within({ ...base, 'protocol.js': 'export const protocols = (', ...sets() }, async d => {
    t.alike(await details(d), ['protocol.js: could not be loaded, its protocols unknown'], 'a protocol.js that does not load: said, not passed over')
  })
})

test('a documentation package: no test of its own asked, a folder documenting one left alone', async (t) => {
  await within({ ...base, 'package.json': { name: 'd', description: 'Docs package: d.', license: 'MIT', type: 'module', docs: true, modules: ['org/m'] }, ...sets([], false), 'test/name/README.md': '# name\n' }, async d => {
    t.alike(await details(d), [])
  })
})

test('a package that breaks each: its files, its sets, a test that is not a unit', async (t) => {
  await within({
    'package.json': { name: 'p', type: 'commonjs' },
    'run.js': '',
    'modules/org/m/package.json': { name: 'm' },
    'test/validate.json': { tests: ['help', 'code', 'gone', 'lone'] },
    'test/full.json': { description: 'Every test.', tests: 'all' },
    'test/lone/notes.txt': 'x'
  }, async d => {
    t.alike(await details(d), [
      'LICENSE: not there',
      'README.md: not there',
      'package.json: modules, the list of our modules it starts from',
      'package.json: no description',
      'package.json: no license',
      'package.json: type commonjs (module)',
      'test/full.json: tests, a list of names',
      'test/lone: no README.md',
      'test/lone: no run.js',
      'test/lone: no test file (*.test.js)',
      'test/lone: not in the full set',
      'test/validate-in-situ.json: not there',
      'test/validate.json: gone, no such test',
      'test/validate.json: mrepo is not in it',
      'test/validate.json: no description',
      'test/validate.json: package is not in it'
    ].sort())
  })
})

test('a test of its own under a generic test\'s name: it would be taken for the generic one', async (t) => {
  await within({ ...base, 'run.js': '', ...sets(), ...unit('help') }, async d => {
    t.alike(await details(d), ['test/help: a generic test\'s name'])
  })
})

test('full holds modules where modules are carried', async (t) => {
  await within({ ...base, ...sets([], false) }, async d => {
    t.alike(await details(d), ['test/full.json: modules is not in it'])
  })
})

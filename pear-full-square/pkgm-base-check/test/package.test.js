// The package check on packages written here: well formed ones, and one
// that breaks each rule.
import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { checkOwn, provides, ownTests, testFolders } from '../index.js'

function write (dir, files) { for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), typeof t === 'string' ? t : JSON.stringify(t)) } }
const within = async (files, fn) => { const d = mkdtempSync(join(tmpdir(), 'package-')); try { write(d, files); return await fn(d) } finally { rmSync(d, { recursive: true, force: true }) } }
const details = async d => (await checkOwn(d)).map(p => p.detail).sort()

// a generic test's folder, and one of the package's own
const generic = name => ({ [`test/${name}/run.js`]: '', [`test/${name}/README.md`]: `# ${name}\n` })
const unit = name => ({ ...generic(name), [`test/${name}/${name}.test.js`]: '' })
const sets = (own = [], modules = true) => ({
  'test/validate.json': { description: 'On its own.', tests: [...own, 'help', 'code', 'mrepo', 'package'] },
  'test/validate-in-situ.json': { description: 'Where it is deployed.', tests: ['help-in-situ', 'mrepo-in-situ'] },
  'test/full.json': { description: 'Every test.', tests: [...own, 'help', 'code', 'mrepo', 'package', ...(modules ? ['modules'] : [])] },
  ...Object.assign({}, ...['help', 'code', 'mrepo', 'package', 'modules', 'help-in-situ', 'mrepo-in-situ'].map(generic))
})
const base = {
  'README.md': '# p\n',
  'test-reports/README.md': '# test-reports/\n',
  LICENSE: 'MIT\n',
  'package.json': { name: 'p', description: 'Package: p.', license: 'MIT', type: 'module', main: 'main.js', modules: ['org/m'], template: { repository: 'haiccing/package-docs-template', commit: 'a'.repeat(40) } },
  'modules/org/m/package.json': { name: 'm' }
}
const PROTOCOL = 'export const protocols = { p: { actions: { a: {} } }, q: { actions: {} } }\nexport const actions = {}\n'

test('a package well formed: a folder for every test, a test of its own, whatever its name: none', async (t) => {
  await within({ ...base, 'protocol.js': PROTOCOL, ...sets(['anything']), ...unit('anything') }, async d => {
    t.alike(await provides(d), { docs: false, protocols: ['p', 'q'], run: false, hooks: false, list: false, modules: true }, 'what it provides, read from its files')
    t.alike(testFolders(d), ['anything', 'code', 'help', 'help-in-situ', 'modules', 'mrepo', 'mrepo-in-situ', 'package'], 'its test folders, the generic ones among them')
    t.alike(ownTests(d), ['anything'], 'its tests of its own: the name is the package\'s')
    t.alike(await details(d), [])
  })
})

test('it tests what it provides: protocols, a program, hooks, a list, and no test of its own', async (t) => {
  await within({ ...base, 'protocol.js': PROTOCOL, ...sets() }, async d => {
    t.alike(await details(d), ['it provides the p protocol, the q protocol: no test of its own'], 'protocols untested: said, each named')
  })
  await within({ ...base, 'run.js': '', 'mrepo/runtime/hooks/boot/x.json': ['a/b'], 'mrepo/packages/layer.json': { packages: ['org/p'] }, ...sets() }, async d => {
    t.alike(await details(d), ['it provides a program (run.js), hooks, an mrepo of its own (its list of packages): no test of its own'], 'what it brings named')
  })
  await within({ ...base, 'protocol.js': 'export const protocols = (', ...sets() }, async d => {
    t.alike(await details(d), ['protocol.js: could not be loaded, its protocols unknown'], 'a protocol.js that does not load: said, not passed over')
  })
})

test('every test has its folder: a generic test named in a set without one', async (t) => {
  const files = { ...base, ...sets() }
  delete files['test/code/run.js']; delete files['test/code/README.md']
  delete files['test/help/README.md']
  await within(files, async d => {
    t.alike(await details(d), ['test/help: no README.md', 'the code test: no folder (test/code/)'], 'no folder: said once, whatever the sets naming it; a folder without its README')
  })
})

test('a documentation package: no test of its own asked, a folder documenting one left alone', async (t) => {
  await within({ ...base, 'package.json': { name: 'd', description: 'Docs package: d.', license: 'MIT', type: 'module', docs: true, modules: ['org/m'], template: { commit: 'b'.repeat(40) } }, ...sets([], false), 'test/name/README.md': '# name\n' }, async d => {
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
    'test/lone/notes.txt': 'x',
    ...generic('help'),
    ...generic('code')
  }, async d => {
    t.alike(await details(d), [
      'LICENSE: not there',
      'README.md: not there',
      'package.json: modules, the list of our modules it starts from',
      'package.json: no description',
      'package.json: no license',
      'package.json: template, the commit of the package template it was brought to',
      'package.json: type commonjs (module)',
      'test-reports/: not there, or without its README.md',
      'test/full.json: tests, a list of names',
      'test/lone: no README.md',
      'test/lone: no run.js',
      'test/lone: no test file (*.test.js)',
      'test/lone: not in the full set',
      'test/validate-in-situ.json: not there',
      'test/validate.json: mrepo is not in it',
      'test/validate.json: no description',
      'test/validate.json: package is not in it',
      'the gone test: no folder (test/gone/)'
    ].sort())
  })
})

test('the template itself has no pin', async (t) => {
  await within({ ...base, 'package.json': { name: 'package-docs-template', description: 'Docs package: the template.', license: 'MIT', type: 'module', docs: true, modules: ['org/m'] }, ...sets([], false) }, async d => {
    t.alike(await details(d), [])
  })
})

test('full holds modules where modules are carried', async (t) => {
  await within({ ...base, ...sets([], false) }, async d => {
    t.alike(await details(d), ['test/full.json: modules is not in it'])
  })
})

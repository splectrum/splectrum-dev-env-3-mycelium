// The mrepo checks on packages written here: one well formed, one that
// breaks each.
import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { checkStructure, checkProtocol, checkCarried, leaves, contributions } from '../index.js'

function write (dir, files) { for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), typeof t === 'string' ? t : JSON.stringify(t)) } }
const KEY = '7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f'
const good = {
  'package.json': { name: 'p', type: 'module', main: 'main.js' },
  'main.js': '',
  'mrepo/README.md': '# mrepo/\n',
  'mrepo/main/layer.json': { mode: 'atomic', description: 'The data.' },
  'mrepo/runtime/service.json': { state: 'booted' },
  'mrepo/packages/layer.json': { mode: 'replicated', description: 'The packages.', packages: ['org/p'] },
  'mrepo/request/pending/default/layer.json': { mode: 'non-atomic', description: 'Waiting.' },
  [`mrepo/request/pending/default/${KEY}.json`]: { topic: '/request/pending/default', key: KEY, value: { topic: null, key: KEY, value: { protocol: 'boot', action: 'deploy', uri: '/host' } } },
  'protocol.js': 'export const protocols = { p: { package: "org/p", description: "P.", actions: { a: { uris: ["/"], description: "A." } } } }\nexport const actions = { p: { a () {} } }\n',
  'modules/third-party.json': { modules: [{ name: 'x', version: '1.0.0' }], omitted: ['y'] },
  'modules/node_modules/x/package.json': { name: 'x', version: '1.0.0' },
  'modules/node_modules/y/package.json': { name: 'y', version: '0.0.0-omitted' }
}

test('a package well formed: its structure, its protocols, what it carries: none', async (t) => {
  const d = mkdtempSync(join(tmpdir(), 'mrepo-'))
  try {
    write(d, good)
    t.alike(leaves(join(d, 'mrepo')), ['main', 'packages', 'request/pending/default'])
    t.alike(contributions(join(d, 'mrepo')), ['runtime/service.json'], 'a file into a layer another package defines')
    t.alike([...checkStructure(d), ...await checkProtocol(d), ...checkCarried(d)], [])
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('a package that breaks each', async (t) => {
  const d = mkdtempSync(join(tmpdir(), 'mrepo-'))
  try {
    write(d, {
      ...good,
      'package.json': { name: 'p', type: 'module', main: 'gone.js' },
      'mrepo/stray.txt': 'x',
      'mrepo/main/layer.json': { mode: 'sometimes' },
      'mrepo/main/README.md': '# no\n',
      'mrepo/packages/layer.json': { mode: 'replicated', description: 'The packages.', packages: ['nameonly'] },
      [`mrepo/request/pending/default/${KEY}.json`]: { topic: '/elsewhere', key: 'other', value: { key: KEY, value: { protocol: 'boot' } } },
      'protocol.js': 'export const protocols = { p: { actions: { a: { description: "A." }, b: { uris: ["/"], description: "B." } } } }\nexport const actions = { p: { a () {}, c () {} } }\n',
      'modules/node_modules/x/package.json': { name: 'x', version: '2.0.0' },
      'modules/node_modules/y/package.json': { name: 'y', version: '1.0.0' },
      'modules/node_modules/z/package.json': { name: 'z', version: '1.0.0' }
    })
    const s = checkStructure(d).map(p => p.detail)
    t.is(s.length, 8, `structure: a stray file, a mode, no description, a README in a layer, the packages list, a preloaded request's topic, key and form\n${s.join('\n')}`)
    const p = (await checkProtocol(d)).map(p => p.detail).sort()
    t.alike(p, ['p a: no uris', 'p b: configured, no function', 'p c: a function, not configured', 'p: no description', 'p: no package'].sort(), 'protocol')
    t.alike(checkCarried(d).map(p => p.detail).sort(), ['package.json: main gone.js not there', 'x: 2.0.0 carried, 1.0.0 recorded', 'y: omitted, yet carried (1.0.0)', 'z: carried, not recorded'].sort(), 'carried')
  } finally { rmSync(d, { recursive: true, force: true }) }
})

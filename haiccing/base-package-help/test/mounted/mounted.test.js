// The package's protocol as it is mounted: its protocol.js, what a runtime
// loads, its config value by value, the layer its structure brings, and
// each action run on a minimal execution: its files by URI in memory, and
// a folder of small bundles written here for extract to read. No mrepo is
// built. Every action the config names must be run here: the last test
// fails when one was left out.
import test from '../../modules/node_modules/brittle/index.js'
import Bundle from '../../modules/node_modules/bare-bundle/index.js'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import { tmpdir } from '../../modules/node_modules/bare-os/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import * as mounted from '../../protocol.js'

const here = dirname(fileURLToPath(import.meta.url))
const ran = new Set()
const act = (name, exec, form) => { ran.add(name); return mounted.actions.help[name](exec, form) }

// A package's bundle, its files given: written into <dir>/packages/<pkg>.bundle.
function bundle (dir, pkg, files) {
  const b = new Bundle()
  for (const [path, text] of Object.entries(files)) b.write(path, Buffer.from(text))
  const file = join(dir, 'packages', `${pkg}.bundle`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, b.toBuffer())
}
// An execution as an action sees it: the mrepo's folder, its files by URI,
// its writes kept in order.
function execution (dir, files = {}) {
  const writes = []
  const exec = {
    runtime: { dir },
    read: async uri => { if (!(uri in files)) throw new Error(`nothing at ${uri}`); return files[uri] },
    put: (uri, bytes) => { writes.push(['put', uri]); files[uri] = Buffer.from(bytes) },
    remove: uri => { writes.push(['remove', uri]); delete files[uri] },
    log: () => {}
  }
  return { exec, writes, files }
}
const manifest = (...pkgs) => Buffer.from(JSON.stringify({ packages: Object.fromEntries(pkgs.map(p => [p, {}])) }))
// Two packages to extract from: one documenting the mrepo (its help at the
// root), one an ordinary package with a folder below it.
const DOCS = { '/package.json': '{"name":"docs","help":"mrepo"}', '/README.md': '# docs\n\nThe docs package.\n\n[mrepo/](mrepo/)\n', '/mrepo/README.md': '# mrepo/\n\nThe mrepo, by layers.\n\n[packages/](packages/)\n', '/mrepo/packages/README.md': '# /packages\n\nThe packages layer.\n' }
const APP = { '/package.json': '{"name":"app"}', '/README.md': '# app\n\nAn app. It does things.\n\n| | |\n|---|---|\n| [test/](test/) | its tests |\n\n## Usage\n\nUse it.\n\n## Notes\n\nNone.\n', '/test/README.md': '# test/\n\nIts tests.\n' }

test('what it provides: one protocol, help, its config and its actions', (t) => {
  t.alike(Object.keys(mounted.protocols), ['help'], 'the package provides the help protocol, and no other')
  t.alike(Object.keys(mounted.actions), ['help'])
  t.alike(Object.keys(mounted.actions.help).sort(), Object.keys(mounted.protocols.help.actions).sort(), 'a function for every action configured, and no other')
})

test('its config, value by value', (t) => {
  const cfg = mounted.protocols.help
  t.is(cfg.package, 'haiccing/base-package-help', 'the package that brings it')
  t.ok(cfg.description, 'its description')
  t.alike(Object.keys(cfg).sort(), ['actions', 'description', 'package'], 'nothing else: no default action, not behind a state')
  t.alike(Object.keys(cfg.actions).sort(), ['extract', 'get'])
  t.alike(cfg.actions.get.uris, ['.'], 'get: at the mrepo itself; what it is about is its argument')
  t.alike(cfg.actions.get.args, ['subject?'], 'its subject: optional, the mrepo itself when none')
  t.alike(cfg.actions.extract.uris, ['.'], 'extract: at the mrepo itself, the whole of it')
  for (const [name, a] of Object.entries(cfg.actions)) {
    t.ok(a.description, `${name}: its description`)
    t.alike(Object.keys(a).filter(k => k !== 'args').sort(), ['description', 'uris'], `${name}: nothing else: no required argument, no target, no states`)
  }
})

test('its structure: it brings the help layer, atomic', (t) => {
  const layer = JSON.parse(readFileSync(join(here, '..', '..', 'mrepo', 'help', 'layer.json'), 'utf8'))
  t.is(layer.mode, 'atomic', 'written by the runtime only, one commit at a time')
  t.ok(layer.description, 'its description')
})

test('extract: the help layer written from the linked packages\' READMEs; again, nothing; a README gone, removed', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'help-mounted-'))
  try {
    bundle(dir, 'org/docs', DOCS)
    bundle(dir, 'org/app', APP)
    const { exec, writes, files } = execution(dir, { '/packages/manifest.json': manifest('org/docs', 'org/app') })
    t.alike(await act('extract', exec, { uri: '.' }), { readmes: 5, changed: true, problems: 0 }, 'what it returns: the READMEs, changed, no problems')
    const written = Object.keys(files).filter(u => u.startsWith('/help/')).sort()
    t.alike(written, ['/help/README.md', '/help/index.json', '/help/layer.json', '/help/packages/README.md', '/help/packages/org/app/README.md', '/help/packages/org/app/test/README.md', '/help/packages/org/docs/README.md', '/help/problems.json'], 'each README at the URI it documents (the mrepo\'s documentation at the root), the index, the problems, the layer\'s own file')
    t.ok(writes.every(([op, uri]) => op === 'put' && uri.startsWith('/help/')), 'it writes the help layer only')
    const index = JSON.parse(files['/help/index.json'].toString())
    t.alike(index['/packages/org/app'], { title: 'app', oneliner: 'An app.', links: ['/packages/org/app/test'] }, 'the index: each URI its title, its one-liner, its links')
    const n = writes.length
    t.alike(await act('extract', exec, { uri: '.' }), { readmes: 5, changed: false, problems: 0 }, 'again, nothing changed')
    t.is(writes.length, n, 'nothing written')
    // the app's test folder goes: its README is removed from the layer
    const { '/test/README.md': gone, ...rest } = APP
    bundle(dir, 'org/app', { ...rest, '/README.md': '# app\n\nAn app. It does things.\n' })
    t.alike(await act('extract', exec, { uri: '.' }), { readmes: 4, changed: true, problems: 0 }, 'a README gone from a package: one fewer')
    t.ok(writes.some(([op, uri]) => op === 'remove' && uri === '/help/packages/org/app/test/README.md'), 'removed from the layer')
    t.absent('/help/packages/org/app/test/README.md' in files)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('extract: its problems counted; the whole mrepo only; no packages, nothing', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'help-mounted-'))
  try {
    bundle(dir, 'org/bad', { '/package.json': '{"name":"bad"}', '/README.md': '# bad\n\nA package (with parentheses in its first sentence) whose README breaks a rule.\n' })
    const one = execution(dir, { '/packages/manifest.json': manifest('org/bad') })
    const r = await act('extract', one.exec, { uri: '.' })
    t.ok(r.problems > 0, `a README against the rules: counted (${r.problems})`)
    t.ok(JSON.parse(one.files['/help/problems.json'].toString()).length === r.problems, 'and written, for the help test to read')
    await t.exception(act('extract', one.exec, { uri: 'main/packages' }), /the whole mrepo only/, 'a URI other than the mrepo itself: refused')
    const none = execution(dir)
    t.alike(await act('extract', none.exec, { uri: '.' }), { readmes: 0, changed: false, problems: 0 }, 'an mrepo with no packages layer: nothing to extract')
    t.is(none.writes.length, 0, 'nothing written')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('get: a URI\'s help at its three levels, one section, and what it says when there is none', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'help-mounted-'))
  try {
    bundle(dir, 'org/docs', DOCS)
    bundle(dir, 'org/app', APP)
    const { exec, writes } = execution(dir, { '/packages/manifest.json': manifest('org/docs', 'org/app') })
    await t.exception(act('get', exec, { uri: 'main' }), /no help extracted in this mrepo yet \(help\/extract\)/, 'before any extraction: said, with what to run')
    await act('extract', exec, { uri: '.' })
    const n = writes.length
    const at = 'packages/org/app'
    const links = [{ uri: 'packages/org/app/test', oneliner: 'Its tests.' }]
    t.alike(await act('get', exec, { uri: 'main', args: [at, 'oneliner'] }), { uri: at, title: 'app', oneliner: 'An app.', links }, 'oneliner: the title, the first sentence, the links each with its own')
    const s = await act('get', exec, { uri: 'main', args: [at] })
    t.alike([s.sections, s.summary.startsWith('An app. It does things.')], [['Usage', 'Notes'], true], 'by default the summary: the text up to the first section, the sections by title')
    const d = await act('get', exec, { uri: 'main', args: [at, 'detail'] })
    t.alike(d.sections, [{ title: 'Usage', text: 'Use it.' }, { title: 'Notes', text: 'None.' }], 'detail: the sections whole')
    t.alike((await act('get', exec, { uri: 'main', args: [at, 'usage'] })).section, { title: 'Usage', text: 'Use it.' }, 'one section, by its title, whatever the case')
    await t.exception(act('get', exec, { uri: 'main', args: [at, 'no', 'such'] }), /no section "no such" at packages\/org\/app \(Usage, Notes\)/, 'a section that is not there: said, with those that are')
    t.is((await act('get', exec, { uri: 'main' })).title, 'mrepo/', 'no subject: the mrepo\'s own documentation')
    t.alike([(await act('get', exec, { uri: 'main', args: ['oneliner'] })).uri, (await act('get', exec, { uri: 'main', args: ['.', 'detail'] })).uri], ['.', '.'], 'a level first, or . written out: the mrepo itself')
    t.is((await act('get', exec, { uri: 'main', args: ['help/packages/org/app'] })).uri, at, 'the subject may be given under help')
    await t.exception(act('get', exec, { uri: 'main', args: ['/packages/org/app'] }), /not a relative URI: \/packages\/org\/app/, 'a subject with a leading slash: refused')
    await t.exception(act('get', exec, { uri: 'main', args: ['packages/org/app/nothing/here'] }), /no help at packages\/org\/app\/nothing\/here: nearest packages\/org\/app/, 'no help there: the nearest URI that has some')
    t.is(writes.length, n, 'get writes nothing')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('every action the config names was run here', (t) => {
  t.alike([...ran].sort(), Object.keys(mounted.protocols.help.actions).sort(), 'none left out: an action added without its test fails this')
})

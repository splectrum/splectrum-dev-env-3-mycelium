// The package's protocol as it is mounted: its protocol.js, what a runtime
// loads, its config value by value and in effect (the request check), and
// each action run on a minimal execution: its files by URI in memory, a
// temporary folder as the parent's. What can be run without building a
// child: every refusal of deploy, and a child without a runtime torn down.
// No mrepo is built, no runtime started. Every action the config names
// must be run here: the last test fails when one was left out.
import test from '../../modules/node_modules/brittle/index.js'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from '../../modules/node_modules/bare-fs/index.js'
import { join } from '../../modules/node_modules/bare-path/index.js'
import { tmpdir } from '../../modules/node_modules/bare-os/index.js'
import { check } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import * as mounted from '../../protocol.js'

const ran = new Set()
const act = (name, exec, form) => { ran.add(name); return mounted.actions.boot[name](exec, form) }
const SHORTCUT = '/xpath/host/shortcut.json'

// An execution as an action sees it: the parent's folder and unique URI,
// its files by URI, its writes kept in order.
function execution (dir, files = {}) {
  const writes = []
  const exec = {
    runtime: { dir, uri: 'local/boot' },
    read: async uri => { if (!(uri in files)) throw new Error(`nothing at ${uri}`); return files[uri] },
    select: async uri => Object.keys(files).filter(p => p === uri || p.startsWith(uri + '/')).map(p => [p, {}]),
    put: (uri, bytes) => { writes.push(['put', uri]); files[uri] = Buffer.from(bytes) },
    remove: uri => { writes.push(['remove', uri]); delete files[uri] },
    commit: async () => { writes.push(['commit']) },
    log: () => {}
  }
  return { exec, writes, files }
}
const within = async fn => { const dir = mkdtempSync(join(tmpdir(), 'boot-mounted-')); try { return await fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) } }
const B = v => Buffer.from(JSON.stringify(v))

test('what it provides: one protocol, boot, its config and its actions', (t) => {
  t.alike(Object.keys(mounted.protocols), ['boot'], 'the package provides the boot protocol, and no other')
  t.alike(Object.keys(mounted.actions), ['boot'])
  t.alike(Object.keys(mounted.actions.boot).sort(), Object.keys(mounted.protocols.boot.actions).sort(), 'a function for every action configured, and no other')
})

test('its config, value by value: each action at a child\'s name, a target needed', (t) => {
  const cfg = mounted.protocols.boot
  t.is(cfg.package, 'haiccing/base-package-boot', 'the package that brings it')
  t.ok(cfg.description, 'its description')
  t.alike(Object.keys(cfg).sort(), ['actions', 'description', 'package'], 'nothing else: no default action')
  t.alike(Object.keys(cfg.actions).sort(), ['deploy', 'redeploy', 'teardown'])
  for (const [name, a] of Object.entries(cfg.actions)) {
    t.alike(a.uris, ['/<name>'], `${name}: at one name below the mrepo, the child's`)
    t.is(a.target, true, `${name}: a target is needed, the mrepo itself is none`)
    t.ok(a.description, `${name}: its description`)
    t.absent(a.states, `${name}: no state of its own: behind a door only where a hook puts it there`)
  }
  t.alike(cfg.actions.deploy.args, ['package'], 'deploy: one argument, required, the package')
  t.alike(cfg.actions.redeploy.args, ['package?'], 'redeploy: the package optional, the one it was deployed from else')
  t.absent(cfg.actions.teardown.args, 'teardown: no argument')
})

test('its config in effect: a request checked: the target, the argument, the URI', (t) => {
  const protocols = mounted.protocols
  const data = { service: null, protocols, active: { boot: protocols.boot } }
  const ask = (action, uri, args) => check({ protocol: 'boot', action, uri, args }, data)
  t.is(ask('deploy', '/host', ['base-component-haicc']), null, 'deploy a child from a package: allowed')
  t.is(ask('deploy', '/', ['base-component-haicc']), 'missing argument: target', 'no target: the mrepo itself is not deployed')
  t.is(ask('deploy', '/host', []), 'missing argument: package', 'deploy without its package: said')
  t.is(ask('redeploy', '/host', []), null, 'redeploy without a package: allowed')
  t.is(ask('teardown', '/host'), null, 'teardown: allowed')
  t.is(ask('teardown', '/'), 'missing argument: target', 'teardown of the mrepo itself: no')
  t.is(ask('deploy', '/swarms/host', ['p']), 'not offered: boot deploy at /swarms/host', 'deeper than one name: not offered')
  t.is(check({ protocol: 'boot', action: 'deploy', uri: '/host', args: ['p'] }, { ...data, active: {} }), 'not now: boot deploy (boot is not active)', 'not activated: refused')
})

test('deploy: each refusal, before anything is built', async (t) => {
  await within(async dir => {
    const store = { '/packages/manifest.json': B({ store: join(dir, 'store'), sources: [] }) }
    const form = (uri, ...args) => ({ uri, args })
    await t.exception(act('deploy', execution(dir, store).exec, form('/', 'p')), /missing argument: target/, 'the mrepo itself')
    await t.exception(act('deploy', execution(dir, store).exec, form('/Host', 'p')), /not a name for an mrepo: \/Host/, 'not a name: one segment, lowercase letters, digits, hyphens')
    await t.exception(act('deploy', execution(dir, { ...store, [SHORTCUT]: B({ mrepo: 'local/host' }) }).exec, form('/host', 'p')), /deployed already: \/host/, 'a child linked there already')
    await t.exception(act('deploy', execution(dir, { ...store, '/main/host/data.json': B({}) }).exec, form('/host', 'p')), /\/host exists locally: the boot protocol cannot target it/, 'data in main at that position: not a target')
    mkdirSync(join(dir, 'main', 'busy'), { recursive: true })
    await t.exception(act('deploy', execution(dir, store).exec, form('/busy', 'p')), /in the way: .*main\/busy/, 'a folder in its place')
    await t.exception(act('deploy', execution(dir, store).exec, form('/host')), /missing argument: package/, 'no package')
    await t.exception(act('deploy', execution(dir, {}).exec, form('/host', 'p')), /no store: the parent's packages manifest names none/, 'a parent that names no store')
    const last = execution(dir, { '/packages/manifest.json': B({ store: join(dir, 'store'), sources: [] }) })
    await t.exception(act('deploy', last.exec, form('/host', 'no-such-package')), 'a package that is in no source: refused')
    t.alike([last.writes, existsSync(join(dir, 'main', 'host'))], [[], false], 'a refusal writes nothing and leaves no folder')
  })
})

test('teardown: a child without a runtime, its folder and its shortcut removed; what is not deployed, refused', async (t) => {
  await within(async dir => {
    const folder = join(dir, 'main', 'host')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'kept.txt'), 'x')
    const { exec, writes, files } = execution(dir, { [SHORTCUT]: B({ mrepo: 'local/host', package: 'haiccing/p' }) })
    t.alike(await act('teardown', exec, { uri: '/host' }), { tornDown: '/host' }, 'what it returns')
    t.absent(existsSync(folder), 'its folder, in the shadow of main at its position: removed')
    t.alike([writes, SHORTCUT in files], [[['remove', SHORTCUT]], false], 'one write: its shortcut out of the xpath layer')
    await t.exception(act('teardown', exec, { uri: '/host' }), /not deployed: \/host/, 'torn down already: not deployed')
    await t.exception(act('teardown', execution(dir, { '/main/data/x.json': B({}) }).exec, { uri: '/data' }), /\/data exists locally: the boot protocol cannot target it/, 'data in main there: not a child')
    await t.exception(act('teardown', exec, { uri: '/' }), /missing argument: target/, 'the mrepo itself')
  })
})

test('redeploy: teardown first; what is not deployed, refused; the package it was deployed from, by default', async (t) => {
  await within(async dir => {
    await t.exception(act('redeploy', execution(dir).exec, { uri: '/host' }), /not deployed: \/host/, 'nothing to tear down: refused, nothing deployed')
    const { exec, writes } = execution(dir, { [SHORTCUT]: B({ mrepo: 'local/host', package: 'haiccing/gone-package' }), '/packages/manifest.json': B({ store: join(dir, 'store'), sources: [] }) })
    await t.exception(act('redeploy', exec, { uri: '/host', args: [] }), 'no package given: the one it was deployed from, here in no source: the deploy refused')
    t.alike(writes.slice(0, 2), [['remove', SHORTCUT], ['commit']], 'torn down first, and that committed in the execution, before the deploy is tried')
  })
})

test('every action the config names was run here', (t) => {
  t.alike([...ran].sort(), Object.keys(mounted.protocols.boot.actions).sort(), 'none left out: an action added without its test fails this')
})

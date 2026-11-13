// The package's protocol as it is mounted: its protocol.js, what a runtime
// loads through the dispatcher's /protocol entry (imported here directly:
// this test is itself run by the dispatcher), its config value by value,
// each action run on a minimal execution, in memory: what it reads and
// writes. No mrepo is built. Every action the config names must be run
// here: the last test fails when one was left out.
import test from '../../modules/node_modules/brittle/index.js'
import * as mounted from '../../protocol.js'

// An execution as an action sees it: the protocols its runtime loaded, the
// files it reads by URI, its writes kept in order.
function execution (protocols = {}, files = {}) {
  const writes = []
  const exec = {
    runtime: { protocols },
    read: async uri => { if (!(uri in files)) throw new Error(`nothing at ${uri}`); return files[uri] },
    put: (uri, bytes) => { writes.push(['put', uri, JSON.parse(bytes.toString())]); files[uri] = Buffer.from(bytes) },
    remove: uri => { writes.push(['remove', uri]); delete files[uri] }
  }
  return { exec, writes, files }
}
const HELP = { package: 'org/help', description: 'Help.', actions: { get: { uris: ['/**'] } } }
const ran = new Set()
const act = (name, exec, form) => { ran.add(name); return mounted.actions.protocol[name](exec, form) }

test('loaded as a runtime loads it: one protocol, protocol, its config and its actions', (t) => {
  t.alike(Object.keys(mounted.protocols), ['protocol'], 'the package provides the protocol protocol, and no other')
  t.alike(Object.keys(mounted.actions), ['protocol'])
  t.alike(Object.keys(mounted.actions.protocol).sort(), Object.keys(mounted.protocols.protocol.actions).sort(), 'a function for every action configured, and no other')
})

test('its config, value by value', (t) => {
  const cfg = mounted.protocols.protocol
  t.is(cfg.package, 'haiccing/base-package-protocol', 'the package that brings it')
  t.ok(cfg.description, 'its description')
  t.alike(Object.keys(cfg).sort(), ['actions', 'description', 'package'], 'nothing else: no default action, not behind a state')
  t.alike(Object.keys(cfg.actions).sort(), ['activate', 'deactivate'])
  for (const [name, a] of Object.entries(cfg.actions)) {
    t.alike(a.uris, ['/'], `${name}: at the mrepo itself, nowhere else`)
    t.alike(a.args, ['protocol'], `${name}: one argument, required: the protocol's name`)
    t.ok(a.description, `${name}: its description`)
    t.alike(Object.keys(a).sort(), ['args', 'description', 'uris'], `${name}: nothing else: no target, no states`)
  }
})

test('activate: the loaded protocol\'s config written into the protocols layer', async (t) => {
  const { exec, writes } = execution({ help: HELP, boot: {} })
  t.alike(await act('activate', exec, { uri: '/', args: ['help'] }), { activated: 'help' }, 'what it returns')
  t.alike(writes, [['put', '/protocols/help.json', HELP]], 'one write: its config, as the runtime loaded it, at /protocols/help.json')
  t.alike(await act('activate', exec, { uri: '/', args: ['help'] }), { activated: 'help' }, 'active already: the same answer')
  t.alike(writes.length, 2, 'written again, nothing else')
  await t.exception(act('activate', exec, { uri: '/', args: ['rest'] }), /no protocol: rest \(boot, help\)/, 'a protocol that is not loaded: refused, those that are named')
  await t.exception(act('activate', exec, { uri: '/' }), /missing argument: protocol/, 'no name: said')
  t.is(writes.length, 2, 'a refusal writes nothing')
})

test('deactivate: its file removed from the protocols layer', async (t) => {
  const { exec, writes, files } = execution({ help: HELP }, { '/protocols/help.json': Buffer.from(JSON.stringify(HELP)) })
  t.alike(await act('deactivate', exec, { uri: '/', args: ['help'] }), { deactivated: 'help' }, 'what it returns')
  t.alike(writes, [['remove', '/protocols/help.json']], 'one write: the file removed')
  t.absent('/protocols/help.json' in files, 'no longer active')
  await t.exception(act('deactivate', exec, { uri: '/', args: ['help'] }), /not active: help/, 'not active: refused')
  await t.exception(act('deactivate', exec, { uri: '/' }), /missing argument: protocol/, 'no name: said')
  t.is(writes.length, 1, 'a refusal writes nothing')
})

test('activate, then deactivate: the layer as it was', async (t) => {
  const { exec, files } = execution({ help: HELP })
  await act('activate', exec, { uri: '/', args: ['help'] })
  await act('deactivate', exec, { uri: '/', args: ['help'] })
  t.alike(Object.keys(files), [], 'nothing left in the protocols layer')
})

test('every action the config names was run here', (t) => {
  t.alike([...ran].sort(), Object.keys(mounted.protocols.protocol.actions).sort(), 'none left out: an action added without its test fails this')
})

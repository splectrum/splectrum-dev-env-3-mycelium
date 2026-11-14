// The package's protocol as it is mounted: its protocol.js, what a runtime
// loads, its config value by value, and its action run on a minimal
// execution, in memory: the shortcuts it reads by URI, what it executes
// here and what it sends on, kept. No mrepo is built. Every action the
// config names must be run here: the last test fails when one was left out.
import test from '../../modules/node_modules/brittle/index.js'
import * as mounted from '../../protocol.js'

const ran = new Set()
const act = (name, exec, form) => { ran.add(name); return mounted.actions.haicc[name](exec, form) }

// An execution as the action sees it: this mrepo's folder, its shortcuts
// entries by URI; a command executed here answers with what it was given.
function execution (shortcuts = {}) {
  const executed = []
  const sent = []
  const exec = {
    runtime: { dir: '/work/mrepos/boot' },
    read: async uri => { if (!(uri in shortcuts)) throw new Error(`nothing at ${uri}`); return Buffer.from(JSON.stringify(shortcuts[uri])) },
    run: async command => { executed.push(command); return { executed: command } },
    forward: (to, command) => { sent.push({ to, command }); return null }
  }
  return { exec, executed, sent }
}
const HOST = { 'main/host/.shortcuts.json': [{ mrepo: 'local/host' }] }

test('what it provides: one protocol, haicc, its config and its action', (t) => {
  t.alike(Object.keys(mounted.protocols), ['haicc'], 'the package provides the haicc protocol, and no other')
  t.alike(Object.keys(mounted.actions), ['haicc'])
  t.alike(Object.keys(mounted.actions.haicc).sort(), Object.keys(mounted.protocols.haicc.actions).sort(), 'a function for every action configured, and no other')
})

test('its config, value by value: goto, the default action, at any position', (t) => {
  const cfg = mounted.protocols.haicc
  t.is(cfg.package, 'haiccing/base-package-haicc', 'the package that brings it')
  t.ok(cfg.description, 'its description')
  t.is(cfg.default, 'goto', 'haicc alone is haicc/goto')
  t.alike(Object.keys(cfg).sort(), ['actions', 'default', 'description', 'package'], 'nothing else')
  t.alike(Object.keys(cfg.actions), ['goto'], 'one action')
  const goto = cfg.actions.goto
  t.alike(goto.uris, ['**'], 'at any position: the root, a shortcut, deeper')
  t.alike(goto.args, ['command'], 'one argument, required and named: the command that follows')
  t.ok(goto.description, 'its description')
  t.alike(Object.keys(goto).sort(), ['args', 'description', 'uris'], 'nothing else: no target, no states: not behind the service\'s door, the command that follows is checked where it is executed')
})

test('goto at the root: the command that follows executed here, its value returned', async (t) => {
  const { exec, executed, sent } = execution(HOST)
  const command = ['boot/deploy', 'host', 'haiccing/base-component-haicc']
  t.alike(await act('goto', exec, { uri: ['main', '.'], args: command }), { executed: command }, 'what the command returns')
  t.alike([executed, sent], [[command], []], 'executed once, as it was given; nothing sent on')
})

test('goto at a shortcut: the command sent on, unchanged, to the mrepo linked there', async (t) => {
  const { exec, executed, sent } = execution(HOST)
  const command = ['haicc', '/node-1', 'service/start']
  t.is(await act('goto', exec, { uri: ['main', 'host'], args: command }), null, 'nothing returned here: the request waits for the linked mrepo\'s response')
  t.alike(sent, [{ to: { at: 'host', mrepo: 'local/host', folder: 'main/host', dir: '/work/mrepos/boot/main/host' }, command }], 'where it leads: the linked mrepo, its folder in the shadow of main; the command as it was, a haicc of its own included: commands chain')
  t.alike(executed, [], 'nothing of it executed here')
})

test('goto: what it refuses', async (t) => {
  const { exec, executed, sent } = execution(HOST)
  await t.exception(act('goto', exec, { uri: ['main', 'host'] }), /missing argument: command/, 'no command follows')
  await t.exception(act('goto', exec, { uri: ['main', '.'], args: [] }), /missing argument: command/, 'an empty one neither')
  await t.exception(act('goto', exec, { uri: ['main', 'swarms/swarm-1'], args: ['boot/deploy', 'node-1'] }), /a position inside main is not built yet/, 'a position inside main other than the root: not built yet, said so')
  await t.exception(act('goto', exec, { uri: ['main', 'host/node-1'], args: ['service/start'] }), /host is a shortcut: a URI does not run through it \(haicc host haicc node-1 \.\.\.\)/, 'a URI through a shortcut: refused, the way across named')
  await t.exception(act('goto', exec, { uri: ['main', 'Host'], args: ['service/start'] }), /not canonical: Host \(host\)/, 'a URI that is not canonical')
  t.alike([executed, sent], [[], []], 'a refusal executes nothing and sends nothing')
})

test('every action the config names was run here', (t) => {
  t.alike([...ran].sort(), Object.keys(mounted.protocols.haicc.actions).sort(), 'none left out: an action added without its test fails this')
})

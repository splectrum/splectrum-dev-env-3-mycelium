// goto on a context written here: its xpath entries by URI; what it runs
// and what it sends on, kept.
import test from 'brittle'
import { goto, CONFIG } from '../index.js'

function context (files) {
  const seen = { ran: [], at: [], sent: [] }
  const exec = {
    runtime: { dir: '/work/mrepos/boot' },
    read: async uri => { if (!(uri in files)) throw new Error('none'); return Buffer.from(JSON.stringify(files[uri])) },
    run: async (command, opts) => { seen.ran.push(command); seen.at.push(opts?.at); return { ran: command } },
    forward: (to, command) => { seen.sent.push({ to, command }); return null }
  }
  return { exec, seen }
}

test('goto: at the root executed here; at a shortcut sent on; no command, a deeper position', async (t) => {
  const { exec, seen } = context({ '/xpath/host/shortcut.json': { mrepo: 'local/host' } })
  t.alike(await goto(exec, { uri: ['main', '.'], args: ['boot/deploy', 'host', 'haiccing/base-component-haicc'] }), { ran: ['boot/deploy', 'host', 'haiccing/base-component-haicc'] }, 'main, the root position: the command executed here, its value returned')
  t.alike(seen.at, [['main']], 'the command that follows stands at the position: its URI is read behind that prefix')
  t.alike(await goto(exec, { uri: ['.'], args: ['help/extract'] }), { ran: ['help/extract'] }, 'the mrepo itself (its own command): executed here')
  t.alike(seen.at, [['main'], []], 'standing at the root: no prefix')
  t.is(await goto(exec, { uri: ['main', 'host'], args: ['haicc', 'swarms/swarm-1', 'boot/deploy', 'node-1'] }), null, 'a shortcut: sent on')
  t.alike(seen.sent, [{ to: { at: 'host', mrepo: 'local/host', folder: 'main/host', dir: '/work/mrepos/boot/main/host' }, command: ['haicc', 'swarms/swarm-1', 'boot/deploy', 'node-1'] }], 'the command that follows, unchanged, to the mrepo linked there')
  t.is(seen.ran.length, 2, 'nothing of it executed here')
  await t.exception(goto(exec, { uri: ['main', 'host'] }), /missing argument: command/)
  await t.exception(goto(exec, { uri: ['main', 'swarms/swarm-1'], args: ['boot/deploy', 'node-1'] }), /haicc swarms\/swarm-1: a position inside main is not built yet/)
  await t.exception(goto(exec, { uri: ['main', 'host/swarms'], args: ['service/start'] }), /host is a shortcut: a URI does not run through it \(haicc host haicc swarms \.\.\.\)/)
  await t.exception(goto(exec, { uri: ['main', '/host'], args: ['service/start'] }), /not a relative URI/)
  await t.exception(goto(exec, { uri: ['runtime'], args: ['service/start'] }), /not a position in main/)
})

test('the config: goto at any position, the default action', (t) => {
  t.is(CONFIG.default, 'goto')
  t.alike(CONFIG.actions.goto.uris, ['**'])
  t.alike(CONFIG.actions.goto.args, ['command'], 'its argument, named: the command that follows')
  t.absent(CONFIG.gated, 'not behind the service\'s door')
  t.ok(CONFIG.description && CONFIG.actions.goto.description)
})

// The command line whole, on a home folder made here: what it prints, what
// it says on stderr, its exit code. A boot mrepo's folder stands in for the
// root: its inbox answered here. No runtime is started.
import test from 'brittle'
import { mkdtempSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'bare-fs'
import { tmpdir } from 'bare-os'
import { join } from 'bare-path'
import { main, LIST, USAGE, CONFIG } from '../index.js'

function setup () {
  const home = mkdtempSync(join(tmpdir(), 'haicc-app-'))
  const out = []; const err = []
  const run = (argv, env = {}) => { out.length = 0; err.length = 0; return main(argv, { env: { HAICC_HOME: home, ...env }, bare: '/no/bare', io: { out: l => out.push(l), err: l => err.push(l), stdio: 'ignore' } }) }
  return { home, root: join(home, 'work', 'mrepos', 'boot'), out, err, run, remove: () => rmSync(home, { recursive: true, force: true }) }
}
// The next record in the root's inbox answered, as its runtime would.
function answer (root, result) {
  const seen = new Set(readdirSync(join(root, 'inbox')))
  return new Promise(resolve => {
    const t = setInterval(() => {
      const file = readdirSync(join(root, 'inbox')).find(f => !seen.has(f) && f.endsWith('.json'))
      if (!file) return
      clearInterval(t)
      const envelope = JSON.parse(readFileSync(join(root, 'inbox', file), 'utf8'))
      const text = JSON.stringify({ topic: '/outbox', key: envelope.key, timestamp: '2026-11-14T00:00:00.000Z', headers: {}, value: { ...envelope.value, value: result === null ? envelope.value.value : { command: envelope.value.value, ...result } } }) + '\n'
      writeFileSync(join(root, 'outbox', file), text)
      resolve({ envelope, text })
    }, 20)
  })
}

test('the usage; not a command: exit 2, said on stderr', async (t) => {
  const s = setup()
  try {
    t.is(await s.run(['--help']), 0)
    t.alike(s.out, [USAGE], 'haicc --help: the usage')
    t.is(await s.run(['nosuch']), 2)
    t.alike([s.out, s.err], [[], ["haicc: no command 'nosuch' (haicc --help)"]], 'haicc: <what>, on stderr; nothing printed')
    t.is(await s.run(['boot']), 2)
    t.alike(s.err, ['haicc: haicc boot/deploy, haicc boot/teardown'])
  } finally { s.remove() }
})

test('nothing booted: an mrepo command and the teardown say so, exit 3; a deploy without the boot component in the sources', async (t) => {
  const s = setup()
  try {
    t.is(await s.run(['host', 'service/start']), 3)
    t.alike(s.err, [`haicc: no boot mrepo at ${join(s.home, 'work')} (haicc boot/deploy)`])
    t.is(await s.run(['boot/teardown']), 3)
    t.alike(s.err, [`haicc: no boot mrepo at ${join(s.home, 'work')} (nothing to tear down)`])
    t.is(await s.run(['.', 'help/get'], { HAICC_WORK: join(s.home, 'elsewhere') }), 3)
    t.alike(s.err, [`haicc: no boot mrepo at ${join(s.home, 'elsewhere')} (haicc boot/deploy)`], 'HAICC_WORK: another work folder')
    mkdirSync(join(s.home, 'src'))
    writeFileSync(join(s.home, LIST), `folder:${join(s.home, 'src')}\n`)
    t.is(await s.run(['boot/deploy']), 3)
    t.alike(s.err, [`haicc: no ${CONFIG.org}/${CONFIG.boot}.bundle in the sources (haicc sources link <folder>)`])
    t.absent(existsSync(join(s.home, 'work')), 'nothing written')
  } finally { s.remove() }
})

test('haicc sources: printed a line a source', async (t) => {
  const s = setup()
  try {
    writeFileSync(join(s.home, LIST), 'folder:/a\ngithub:haiccing\n')
    t.is(await s.run(['sources']), 0)
    t.alike(s.out, ['folder:/a', 'github:haiccing'])
    t.is(await s.run(['sources', 'download', 'haiccing']), 3)
    t.alike(s.err, ['haicc: haiccing: not published yet; link a sources folder (haicc sources link <folder>)'], 'said once, exit 3')
  } finally { s.remove() }
})

test('a command for the mrepos: its response printed unpacked, as stored, or its output alone; an error, exit 1; no completed form, exit 5; none in time, exit 4', async (t) => {
  const s = setup()
  try {
    mkdirSync(join(s.root, 'inbox'), { recursive: true }); mkdirSync(join(s.root, 'outbox'))
    const long = { deployed: 'host', mrepo: 'local/host', package: 'haiccing/base-component-haicc', runtime: { pid: 4242 } }
    let a = answer(s.root, { output: long })
    t.is(await s.run(['.', 'boot/deploy', 'host', 'base-component-haicc']), 0, 'an output: exit 0')
    let { envelope, text } = await a
    t.is(envelope.topic, `/${CONFIG.root.uri}/inbox`, 'sent to the root mrepo\'s inbox')
    t.is(envelope.value.topic, CONFIG.reply, 'its core addressed back to the terminal')
    t.alike(envelope.value.value, ['boot/deploy', 'host', 'base-component-haicc'], 'at the root: the command plain')
    t.is(s.out.length, 1)
    t.ok(s.out[0].includes('\n    "topic": "/haicc/terminal",\n'), 'by default the record unpacked: the core two deep, an entry a line')
    t.is(s.out[0].split('\n').map(l => l.replace(/^ */, '').replace(/([^\\])": /g, '$1":')).join(''), text.trim(), 'packed again: the record as stored')

    a = answer(s.root, { output: long })
    t.is(await s.run(['--raw', 'host', 'service/start']), 0)
    ;({ envelope, text } = await a)
    t.alike(envelope.value.value, ['haicc', 'host', 'service/start'], 'elsewhere: the haicc command as it is')
    t.alike(s.out, [text.trim()], '--raw: the record as stored, one line')

    a = answer(s.root, { output: long })
    t.is(await s.run(['.', 'help/get'], { HAICC_RAW: '1' }), 0); await a
    t.is(s.out[0].split('\n').length, 1, 'HAICC_RAW=1: the same')

    a = answer(s.root, { output: long })
    t.is(await s.run(['.', 'help/get'], { HAICC_WIDTH: '1000' }), 0); await a
    t.is(s.out[0].split('\n').length, 1, 'HAICC_WIDTH: a record that fits it left on one line')

    a = answer(s.root, { output: { service: 'started', state: 'started' } })
    t.is(await s.run(['--output', 'host', 'service/start']), 0); await a
    t.alike(s.out, ['{"service":"started","state":"started"}'], '--output: the output alone, as stored')

    a = answer(s.root, { output: { service: 'started', state: 'started' } })
    t.is(await s.run(['host', 'service/start'], { HAICC_OUTPUT: '1', HAICC_RAW: '1' }), 0); await a
    t.alike(s.out, ['{"service":"started","state":"started"}'], 'HAICC_OUTPUT=1: the same, before HAICC_RAW')

    a = answer(s.root, { error: 'deployed already: /host' })
    t.is(await s.run(['.', 'boot/deploy', 'host', 'x']), 1, 'an error: exit 1')
    ;({ text } = await a)
    t.alike(s.err, ['haicc: deployed already: /host'], 'its error on stderr')
    t.is(s.out.length, 1, 'the record printed all the same')

    a = answer(s.root, { error: 'deployed already: /host' })
    t.is(await s.run(['--output', '.', 'boot/deploy', 'host', 'x']), 1); await a
    t.alike([s.out, s.err], [[], ['haicc: deployed already: /host']], '--output: the error alone')

    a = answer(s.root, null)
    t.is(await s.run(['.', 'help/get']), 5, 'a response with no completed form: exit 5'); await a
    t.alike(s.err, ['haicc: the response holds no completed form'])

    t.is(await s.run(['.', 'help/get'], { HAICC_TIMEOUT: '0.3' }), 4, 'HAICC_TIMEOUT: no response in time, exit 4')
    t.ok(/^haicc: no response in 0\.3 s \(the request stays: [0-9a-f-]{36}\)$/.test(s.err[0]), s.err[0])
  } finally { s.remove() }
})

test('boot/teardown: what boot/deploy put in place removed, nothing else; no runtime running: none stopped', async (t) => {
  const s = setup()
  try {
    const work = join(s.home, 'work')
    for (const d of ['mrepos/boot/.git', 'mrepos/boot/inbox', 'mrepos/boot/main/host/.git', 'mrepos/boot/main/host/main/swarms/node-1/.git', 'packages/haiccing', 'kept']) mkdirSync(join(work, d), { recursive: true })
    writeFileSync(join(work, 'mrepo.json'), '{}')
    t.is(await s.run(['boot/teardown']), 0)
    t.alike(s.out, [JSON.stringify({ tornDown: '.', runtimes: 0, work })], 'said: the root torn down, the runtimes stopped, the work folder')
    t.alike(readdirSync(work), ['kept'], 'the mrepos, the package store and the setting removed; the rest of the work folder kept')
    t.is(await s.run(['boot/teardown']), 3, 'twice: nothing there, exit 3')
  } finally { s.remove() }
})

// The package's own test: its program, the haicc command line, run as a
// process on a home folder made here (README.md beside it). A folder stands
// in for the root mrepo: its inbox is answered here. No runtime is started.
import test from '../../modules/node_modules/brittle/index.js'
import { mkdtempSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync } from '../../modules/node_modules/bare-fs/index.js'
import os from '../../modules/node_modules/bare-os/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import { spawn } from '../../modules/node_modules/bare-subprocess/index.js'
import { CONFIG, USAGE } from '../../modules/pear-full-square/haicc-base-app/index.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const home = mkdtempSync(join(os.tmpdir(), 'app-haicc-'))
const work = join(home, 'work')
const root = join(work, 'mrepos', CONFIG.root.name)

// The command line run through the package's dispatcher, as the platform's
// haicc starts it: bare <package> /run <argument>...; what it printed, what
// it said on stderr, its exit code. via: the program instead (run.js).
function haicc (args, { env = {}, via = ['main.js', '/run'] } = {}) {
  const all = { ...Object.fromEntries(os.getEnvKeys().filter(k => !k.startsWith('HAICC_')).map(k => [k, os.getEnv(k)])), HAICC_HOME: home, ...env }
  return new Promise(resolve => {
    const child = spawn(os.execPath(), [join(pkg, via[0]), ...via.slice(1), ...args], { stdio: ['ignore', 'pipe', 'pipe'], env: all })
    let out = ''
    let err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('exit', code => resolve({ code, out, err }))
  })
}
// The next record in the root's inbox answered in its outbox, as its
// runtime would: the envelope it read, the response it wrote.
function answer (result) {
  const seen = new Set(readdirSync(join(root, 'inbox')))
  return new Promise(resolve => {
    const t = setInterval(() => {
      const file = readdirSync(join(root, 'inbox')).find(f => !seen.has(f) && f.endsWith('.json'))
      if (!file) return
      clearInterval(t)
      const envelope = JSON.parse(readFileSync(join(root, 'inbox', file), 'utf8'))
      const text = JSON.stringify({ topic: '/outbox', key: envelope.key, timestamp: '2026-11-14T00:00:00.000Z', headers: {}, value: { ...envelope.value, value: result === null ? envelope.value.value : { command: envelope.value.value, ...result } } }) + '\n'
      writeFileSync(join(root, 'outbox', `${file}.part`), text)
      writeFileSync(join(root, 'outbox', file), text)
      resolve({ file, envelope, text })
    }, 20)
  })
}
const ran = new Set()
const asked = (kind, r) => { ran.add(kind); return r }

test('the usage: every form of the command line, printed; exit 0', async (t) => {
  for (const a of [['--help'], ['help'], ['-h'], []]) {
    const r = asked('usage', await haicc(a))
    t.alike([r.code, r.out, r.err], [0, USAGE + '\n', ''], `haicc ${a.join(' ')}`)
  }
  for (const form of ['haicc <URI> <protocol>/<action> <argument>...', 'haicc --raw <URI>', 'haicc --output <URI>', 'haicc boot/deploy', 'haicc boot/teardown', 'haicc sources', 'haicc sources unlink <folder>', 'haicc sources download [<what>...]', 'haicc sources https | no-https']) t.ok(USAGE.includes(form), `in it: ${form}`)
})

test('not a command: exit 2, said on stderr, nothing printed', async (t) => {
  for (const [a, said] of [
    [['nosuch'], "haicc: no command 'nosuch' (haicc --help)"],
    [['/'], 'haicc: haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)'],
    [['/host'], 'haicc: haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)'],
    [['boot'], 'haicc: haicc boot/deploy, haicc boot/teardown'],
    [['boot/nosuch'], 'haicc: no action: boot nosuch (deploy, teardown)'],
    [['boot/deploy', 'host'], 'haicc: haicc boot/deploy (no arguments)'],
    [['--output'], 'haicc: --output goes before a URI'],
    [['--raw'], 'haicc: --raw goes before a URI'],
    [['sources', 'link', '/x'], 'haicc: haicc sources [unlink <folder> | download [<what>...] | https | no-https]']
  ]) {
    const r = await haicc(a)
    t.alike([r.code, r.out, r.err], [2, '', said + '\n'], `haicc ${a.join(' ')}`)
  }
})

test('nothing booted: said, exit 3, nothing written', async (t) => {
  let r = asked('request', await haicc(['/host', 'service/start']))
  t.alike([r.code, r.out, r.err], [3, '', `haicc: no boot mrepo at ${work} (haicc boot/deploy)\n`], 'a command for the mrepos')
  r = asked('boot/teardown', await haicc(['boot/teardown']))
  t.alike([r.code, r.out, r.err], [3, '', `haicc: no boot mrepo at ${work} (nothing to tear down)\n`], 'haicc boot/teardown')
  r = asked('boot/deploy', await haicc(['boot/deploy']))
  t.alike([r.code, r.out, r.err], [3, '', `haicc: no ${CONFIG.org}/${CONFIG.boot}.bundle in the sources (haicc sources link <folder>)\n`], 'haicc boot/deploy, no source holding the boot component')
  r = await haicc(['/', 'help/get'], { env: { HAICC_WORK: join(home, 'elsewhere') } })
  t.alike([r.code, r.err], [3, `haicc: no boot mrepo at ${join(home, 'elsewhere')} (haicc boot/deploy)\n`], 'HAICC_WORK: another work folder')
  t.alike(readdirSync(home), [], 'nothing written')
})

test('haicc sources: the list in its own folder, read and changed', async (t) => {
  mkdirSync(join(home, 'src'))
  writeFileSync(join(home, 'sources.list'), `github:${CONFIG.org}\nfolder:${join(home, 'src')}\n`)
  let r = asked('sources', await haicc(['sources']))
  t.alike([r.code, r.out], [0, `folder:${join(home, 'src')}\ngithub:${CONFIG.org}\n`], 'haicc sources: the folders first, https after')
  r = await haicc(['sources', 'no-https'])
  t.alike([r.code, r.out], [0, `folder:${join(home, 'src')}\n`], 'no-https: the backup off')
  r = await haicc(['sources', 'https'])
  t.alike([r.code, r.out], [0, `folder:${join(home, 'src')}\ngithub:${CONFIG.org}\n`], 'https: back on')
  r = await haicc(['sources', 'download', CONFIG.org])
  t.alike([r.code, r.out, r.err], [3, '', `haicc: ${CONFIG.org}: not published yet; link a sources folder (haicc sources link <folder>)\n`], 'download: our packages are not published yet, exit 3')
  r = await haicc(['sources', 'unlink', join(home, 'src')])
  t.alike([r.code, r.out], [0, `github:${CONFIG.org}\n`], 'unlink')
  t.is(readFileSync(join(home, 'sources.list'), 'utf8'), `github:${CONFIG.org}\n`, 'the list written')
})

test('a command for the mrepos: its record in the root\'s inbox, value by value', async (t) => {
  mkdirSync(join(root, 'inbox'), { recursive: true }); mkdirSync(join(root, 'outbox'))
  let a = answer({ output: { deployed: '/host' } })
  let r = asked('request', await haicc(['--output', '/', 'boot/deploy', 'host', 'base-component-haicc']))
  let { file, envelope } = await a
  t.is(r.code, 0, r.err)
  t.is(envelope.topic, `/${CONFIG.root.uri}/inbox`, 'an envelope addressed to the root mrepo\'s inbox: /local/boot/inbox')
  t.is(file, `${envelope.key}.json`, 'its document named by its key')
  t.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(envelope.key), 'the key a GUID')
  t.alike(envelope.headers, {}, 'its headers empty')
  t.is(envelope.value.topic, '/haicc/terminal', 'its core addressed back to the terminal')
  t.is(envelope.value.key, envelope.key, 'the same key')
  t.alike(envelope.value.headers, {}, 'the core\'s headers empty')
  t.alike(envelope.value.value, ['boot/deploy', 'host', 'base-component-haicc'], 'at the root the command plain, its parts as typed, unnamed')
  t.alike(readdirSync(join(root, 'inbox')), [file], 'nothing half written left beside it')

  a = answer({ output: 1 })
  r = await haicc(['--output', '/host', 'haicc', '/node-1', 'help/get', '/packages', 'no "such" section'])
  ;({ envelope } = await a)
  t.alike(envelope.value.value, ['haicc', '/host', 'haicc', '/node-1', 'help/get', '/packages', 'no "such" section'], 'anywhere else the haicc command as it is: chained, an argument with spaces and quotes one part')

  a = answer({ output: 1 })
  r = await haicc(['/run', 'service/start'], { env: { HAICC_OUTPUT: '1' } })
  ;({ envelope } = await a)
  t.alike(envelope.value.value, ['haicc', '/run', 'service/start'], 'a position named /run: a URI, not the entry\'s name')
  a = answer({ output: 1 })
  r = await haicc(['/run', 'service/start'], { env: { HAICC_OUTPUT: '1' }, via: ['run.js'] })
  ;({ envelope } = await a)
  t.alike(envelope.value.value, ['haicc', '/run', 'service/start'], 'the same from the program itself (bare run.js)')
})

test('its response: the record unpacked, as stored, or the output alone; the exit code from its completed form', async (t) => {
  const output = { deployed: '/host', mrepo: 'local/host', package: 'haiccing/base-component-haicc', runtime: { pid: 4242, started: '2026-11-14T00:00:00.000Z' } }
  const packed = s => s.split('\n').map(l => l.replace(/^ */, '').replace(/([^\\])": /g, '$1":')).join('')
  let a = answer({ output })
  let r = await haicc(['/', 'boot/deploy', 'host', 'base-component-haicc'])
  let { text } = await a
  t.alike([r.code, r.err], [0, ''], 'an output: exit 0')
  t.ok(r.out.includes('\n    "topic": "/haicc/terminal",\n'), 'by default the record unpacked across lines: the core two deep')
  t.ok(r.out.includes('\n      "command": ["boot/deploy","host","base-component-haicc"],\n'), 'the form three deep; what fits on a line left as stored')
  t.is(packed(r.out), text.trim(), 'packed again: the record as stored, nothing of it changed')

  a = answer({ output })
  r = await haicc(['/', 'help/get'], { env: { HAICC_WIDTH: '1000' } })
  ;({ text } = await a)
  t.is(r.out, text, 'HAICC_WIDTH: a record that fits it left on one line')

  for (const [args, env] of [[['--raw', '/', 'help/get'], {}], [['/', 'help/get'], { HAICC_RAW: '1' }]]) {
    a = answer({ output })
    r = await haicc(args, { env })
    ;({ text } = await a)
    t.alike([r.code, r.out], [0, text], `${args[0] === '--raw' ? '--raw' : 'HAICC_RAW=1'}: the record as stored, one line`)
  }
  for (const [args, env] of [[['--output', '/', 'help/get'], {}], [['/', 'help/get'], { HAICC_OUTPUT: '1', HAICC_RAW: '1' }]]) {
    a = answer({ output: { service: 'started', state: 'started' } })
    r = await haicc(args, { env }); await a
    t.alike([r.code, r.out], [0, '{"service":"started","state":"started"}\n'], `${args[0] === '--output' ? '--output' : 'HAICC_OUTPUT=1, before HAICC_RAW'}: the output alone`)
  }

  a = answer({ error: 'deployed already: /host' })
  r = await haicc(['/', 'boot/deploy', 'host', 'x'])
  ;({ text } = await a)
  t.alike([r.code, r.err], [1, 'haicc: deployed already: /host\n'], 'an error: exit 1, said on stderr')
  t.is(packed(r.out), text.trim(), 'its record printed all the same')
  a = answer({ error: 'deployed already: /host' })
  r = await haicc(['--output', '/', 'boot/deploy', 'host', 'x']); await a
  t.alike([r.code, r.out, r.err], [1, '', 'haicc: deployed already: /host\n'], '--output: the error alone')

  a = answer(null)
  r = await haicc(['--output', '/', 'help/get']); await a
  t.alike([r.code, r.out, r.err], [5, '', 'haicc: the response holds no completed form\n'], 'a response whose form is not completed: exit 5')

  r = await haicc(['/', 'help/get'], { env: { HAICC_TIMEOUT: '0.5' } })
  t.is(r.code, 4, 'HAICC_TIMEOUT: no response in time, exit 4')
  t.ok(/^haicc: no response in 0\.5 s \(the request stays: [0-9a-f-]{36}\)\n$/.test(r.err), 'said, with the request\'s key')
})

test('boot/teardown: what boot/deploy put in place removed by name, the rest kept', async (t) => {
  for (const d of ['mrepos/boot/.git', 'mrepos/boot/main/host/.git', 'packages/haiccing', 'kept']) mkdirSync(join(work, d), { recursive: true })
  writeFileSync(join(work, 'mrepo.json'), '{}')
  let r = asked('boot/teardown', await haicc(['boot/teardown']))
  t.alike([r.code, r.out, r.err], [0, JSON.stringify({ tornDown: '/', runtimes: 0, work }) + '\n', ''], 'said: the root torn down, no runtime was running')
  t.alike(readdirSync(work), ['kept'], 'the mrepos, the package store and the setting removed; nothing else')
  t.ok(existsSync(join(home, 'sources.list')), 'the sources list kept')
  r = await haicc(['boot/teardown'])
  t.is(r.code, 3, 'twice: nothing there, exit 3')
})

test('every kind of command line was run here', (t) => {
  t.alike([...ran].sort(), ['boot/deploy', 'boot/teardown', 'request', 'sources', 'usage'], 'the usage, the sources, a command for the mrepos, and each machine level action')
  rmSync(home, { recursive: true, force: true })
  t.absent(existsSync(home), 'the home folder made for the tests removed')
})

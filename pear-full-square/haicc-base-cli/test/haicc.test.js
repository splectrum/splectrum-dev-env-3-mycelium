import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { ask } from '../../mrepo-base-runtime/index.js'
import { bootedHost } from '../../mrepo-base-runtime/test/fixture.js'
import { parse, send } from '../index.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeBundle = join(here, '..', 'mrepo-base-runtime', 'runtime.js')
const haicc = (...args) => spawnSync(Bare.argv[0], [join(here, 'haicc.js'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

test('version: the module and its version, as JSON', (t) => {
  const r = haicc('version')
  t.is(r.status, 0)
  t.is(JSON.parse(String(r.stdout)).name, 'haicc-base-cli')
})

test('parse: a request, fully qualified, or an action unique among the protocols expanded', (t) => {
  t.alike(parse(['rest', 'put', '/Main//x.json', '{"a":1}']), { protocol: 'rest', action: 'put', uri: '/main/x.json', body: { a: 1 } })
  t.alike(parse(['get', '/']), { protocol: 'rest', action: 'get', uri: '/' }, 'get: rest\'s')
  t.alike(parse(['start', '/']), { protocol: 'service', action: 'start', uri: '/' }, 'start: service\'s')
  t.ok(parse(['rest', 'start', '/']).error, 'not an action of rest')
  t.ok(parse(['fly', '/']).error, 'no such action')
  t.ok(parse(['get']).error, 'no URI')
  t.ok(parse(['get', '/a_b']).error, 'a bad URI')
  t.ok(parse(['put', '/main/x.json', '{nope']).error, 'bad JSON')
  t.ok(parse([]).error)
})

test('a bad call: exit 2, said on stderr', (t) => {
  const r = haicc('fly', '/')
  t.is(r.status, 2)
  t.ok(String(r.stderr).includes('not an action: fly'))
})

for (const storage of ['p2p', 'git']) {
  test(`send on ${storage}: the runtime started when it is not running; the request answered`, { timeout: 120000 }, async (t) => {
    const work = mkdtempSync(join(tmpdir(), `cli-${storage}-`))
    try {
      t.is((await send({ work, protocol: 'rest', action: 'get', uri: '/' })).code, 1, 'no repository: not done')
      await bootedHost(work, { storage })
      t.is(await ask({ work, op: 'status' }), null, 'no runtime yet')
      const started = await send({ work, protocol: 'service', action: 'start', uri: '/', bundle: runtimeBundle })
      t.is(started.code, 0)
      t.alike(started.out.value, { api: 'haicc', protocol: 'service', action: 'start', uri: '/', output: { service: 'started' } }, 'started, the preloaded initialise first: the form completed')
      t.is(started.out.topic, '/haicc/terminal', 'a record, addressed to this input')
      const running = await ask({ work, op: 'status' })
      t.ok(running, 'the runtime running')
      const r = haicc('put', '/main/notes/hello.json', '{"text":"hi"}', `--work=${work}`)
      t.is(r.status, 0, String(r.stderr))
      t.alike(JSON.parse(String(r.stdout)).value.output, { put: '/main/notes/hello.json' }, 'printed: the record')
      t.is(JSON.parse(String(r.stdout)).value.command, 'haicc put /main/notes/hello.json {"text":"hi"}', 'the command as typed, in the form')
      const g = haicc('rest', 'get', '/main/notes/hello.json', `--work=${join(work, 'mrepos')}`)
      t.alike(JSON.parse(String(g.stdout)).value.output, { text: 'hi' }, 'its work folder found walking up')
      const refused = haicc('put', '/packages/x.json', '1', `--work=${work}`)
      t.is(refused.status, 1, 'refused: exit 1')
      t.is(JSON.parse(String(refused.stdout)).value.error, 'not offered: rest put at /packages/x.json')
      t.alike((await send({ work, protocol: 'service', action: 'stop', uri: '/' })).out.value.output, { service: 'initialised' })
      t.alike((await send({ work, protocol: 'service', action: 'shutdown', uri: '/' })).out.value.output, { service: 'booted' })
      // Ended, not only silent: it stops answering first, then commits its
      // last log lines and closes its store.
      const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
      for (let i = 0; i < 100 && alive(running.pid); i++) await new Promise(resolve => setTimeout(resolve, 100))
      t.absent(alive(running.pid), 'shut down: the runtime ended')
      t.is(await ask({ work, op: 'status' }), null)
    } finally { rmSync(work, { recursive: true, force: true }) }
  })
}

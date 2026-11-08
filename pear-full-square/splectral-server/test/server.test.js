// The server's shell with a throwaway extension: a file source mapped into
// the abstract world, the menu following what is available, an action
// dispatched and recorded, the files the browser loads.
import test from 'brittle'
import http from 'bare-http1'
import { mkdtempSync, writeFileSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { startServer } from '../index.js'
import { openTopic, folderStorage } from '../../mycelium-topic/index.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// A request over HTTP, as the browser makes it: its status and its body.
const fetch = (url, { method = 'GET', body } = {}) => new Promise((resolve, reject) => {
  const req = http.request(url, { method }, res => {
    const chunks = []
    res.on('data', c => chunks.push(Buffer.from(c)))
    res.on('end', () => { const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, json: async () => JSON.parse(text) }) })
  })
  req.on('error', reject)
  req.end(body)
})

test('sources, mappers, menu, actions, files', async (t) => {
  const w = mkdtempSync(join(tmpdir(), 'spl-'))
  const ext = join(w, 'ext')
  mkdirSync(ext)
  // On Bare a module's type is its folder's package.json's.
  writeFileSync(join(ext, 'package.json'), JSON.stringify({ type: 'module' }))
  writeFileSync(join(ext, 'splectral.json'), JSON.stringify({ name: 'test-ext', contract: '0.1', provides: [
    { kind: 'mapper', id: 'demo', holds: 'demo/*', module: 'mapper.js' },
    { kind: 'page', id: 'all', title: 'All', needs: ['world'], module: 'all.js' },
    { kind: 'page', id: 'one', title: 'One', needs: ['node'], module: 'one.js' },
    { kind: 'action', id: 'echo', module: 'echo.js' }
  ] }))
  writeFileSync(join(ext, 'mapper.js'), "export default () => r => [{ kind: 'joined', uri: r.value.uri, host: 'h' }]\n")
  writeFileSync(join(ext, 'all.js'), 'export default () => null\n')
  writeFileSync(join(ext, 'one.js'), 'export default () => null\n')
  writeFileSync(join(ext, 'echo.js'), 'export default async args => ({ echoed: args.text })\n')
  const topic = await openTopic({ storage: folderStorage(join(w, 'topic')) })
  await topic.produce({ value: { uri: '/s/a' } })
  const s = await startServer({ config: { extensions: [ext], sources: [{ kind: 'file', path: join(w, 'topic'), holds: 'demo/nodes', every: 20 }], runs: join(w, 'runs') } })
  for (let i = 0; i < 50 && !s.model.snapshot().nodes['/s/a']; i++) await sleep(20)
  t.is(s.model.snapshot().nodes['/s/a'].status, 'running')
  // The menu: one page for the world, one per node.
  t.alike(s.menu().map(e => e.title), ['All', 'One: /s/a'])
  await topic.produce({ value: { uri: '/s/b' } })
  for (let i = 0; i < 50 && !s.model.snapshot().nodes['/s/b']; i++) await sleep(20)
  t.alike(s.menu().map(e => e.title), ['All', 'One: /s/a', 'One: /s/b'])
  // An action, dispatched, recorded; an unknown one refused.
  t.alike(await (await fetch(`${s.url}/act`, { method: 'POST', body: JSON.stringify({ action: 'echo', with: { text: 'hi' } }) })).json(), { ok: true, result: { echoed: 'hi' } })
  t.is((await (await fetch(`${s.url}/act`, { method: 'POST', body: JSON.stringify({ action: 'nope' }) })).json()).ok, false)
  const log = await (await openTopic({ storage: folderStorage(join(w, 'runs', 'actions')) })).consume(0)
  t.alike(log.map(r => [r.value.action, r.value.ok]), [['echo', true], ['nope', false]]) // refused, and recorded as refused
  // The files: the shell, shared modules, extensions, vendor; nothing else.
  for (const [p, status] of [['/', 200], ['/m/splectral-shell/app.js', 200], ['/m/splectral-model/index.js', 200], ['/m/test-ext/all.js', 200], ['/vendor/react.js', 200], ['/vendor/htm.js', 200], ['/m/test-ext/../../etc/passwd', 404], ['/m/unknown/x.js', 404]]) {
    t.is((await fetch(s.url + p)).status, status, p)
  }
  await s.close()
})

test('clients through topics: an action produced while the server is down is answered when it starts; the browser\'s adapter is a client', async (t) => {
  const { askServer } = await import('../client.js')
  const w = mkdtempSync(join(tmpdir(), 'spl-clients-'))
  const ext = join(w, 'ext')
  mkdirSync(ext)
  // On Bare a module's type is its folder's package.json's.
  writeFileSync(join(ext, 'package.json'), JSON.stringify({ type: 'module' }))
  writeFileSync(join(ext, 'splectral.json'), JSON.stringify({ name: 'echo-ext', contract: '0.2', provides: [{ kind: 'action', id: 'echo', module: 'echo.js' }] }))
  writeFileSync(join(ext, 'echo.js'), 'export default async args => ({ echoed: args.text })\n')
  const runs = join(w, 'runs')
  // Asked before the server runs: the action waits in the client's topic.
  const early = askServer({ runs, action: 'echo', with: { text: 'early' }, timeout: 20000, every: 50 })
  await new Promise(resolve => setTimeout(resolve, 300))
  const s = await startServer({ config: { extensions: [ext], sources: [], runs } })
  t.alike(await early, { ok: true, result: { echoed: 'early' } })
  // The browser's way: HTTP, adapted onto the client topic 'browser'.
  const out = await (await fetch(`${s.url}/act`, { method: 'POST', body: JSON.stringify({ action: 'echo', with: { text: 'http' } }) })).json()
  t.alike(out, { ok: true, result: { echoed: 'http' } })
  const bad = await askServer({ runs, action: 'nope', timeout: 20000, every: 50 })
  t.is(bad.ok, false)
  await s.close()
  // Everything recorded, with who asked.
  const log = (await (await openTopic({ storage: folderStorage(join(runs, 'actions')) })).consume(0)).map(r => [r.value.action, r.value.ok, (r.value.client || '').split('-')[0]])
  t.alike(log, [['echo', true, 'cli'], ['echo', true, 'browser'], ['nope', false, 'cli']])
})

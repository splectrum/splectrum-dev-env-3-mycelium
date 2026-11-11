import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openRepo } from 'mycelium-git'
import { start, ask, open } from 'mrepo-base-runtime'
import { build } from '../index.js'
import { send } from 'mrepo-base-runtime/test/fixture.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const PRELOADED = '7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f'
// A boot mrepo's structure, written here (the module's tests stand on their
// own): its layers, a layer.json each, a preloaded boot deploy /host.
const BOOT = mkdtempSync(join(tmpdir(), 'boot-structure-'))
for (const l of ['main', 'runtime', 'inbox', 'outbox', 'packages', 'request/pending/default', 'request/execute', 'request/done']) {
  mkdirSync(join(BOOT, l), { recursive: true })
  writeFileSync(join(BOOT, l, 'layer.json'), JSON.stringify({ mode: l.startsWith('request') || l.endsWith('box') ? 'non-atomic' : 'atomic', description: l }))
}
const preloaded = { api: 'boot', protocol: 'boot', action: 'deploy', uri: '/host', body: { package: 'haiccing/base-package-runtime' } }
writeFileSync(join(BOOT, 'request', 'pending', 'default', `${PRELOADED}.json`), JSON.stringify({ topic: '/request/pending/default', key: PRELOADED, timestamp: '2026-11-11T00:00:00.000Z', headers: {}, value: { topic: null, key: PRELOADED, timestamp: '2026-11-11T00:00:00.000Z', headers: {}, value: preloaded } }))
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const req = (protocol, action, uri) => ({ api: 'boot', protocol, action, uri })

test('the boot mrepo: built from its folder, the same twice', async (t) => {
  const a = mkdtempSync(join(tmpdir(), 'build-a-'))
  const b = mkdtempSync(join(tmpdir(), 'build-b-'))
  try {
    const one = await build({ from: BOOT, work: a, name: 'boot', time: 1762732800 })
    const two = await build({ from: BOOT, work: b, name: 'boot', time: 1762732800 })
    t.alike(Object.keys(one.layers).sort(), ['inbox', 'main', 'outbox', 'packages', 'request/done', 'request/execute', 'request/pending/default', 'runtime'], 'a layer per leaf')
    t.alike(one.layers, two.layers, 'the same folder, the same commits')
    t.alike(JSON.parse(readFileSync(join(a, 'mrepo.json'))), { storage: 'filesystem', name: 'boot' }, 'the setting: every layer on the filesystem')
    t.ok(existsSync(join(a, 'mrepos', 'boot', 'inbox', 'layer.json')), 'the inbox\'s working tree')
    t.ok(existsSync(join(a, 'mrepos', 'boot', 'outbox', 'layer.json')), 'the outbox\'s working folder, there before any record')
    const r = await open(a)
    const repo = openRepo(r.backend)
    t.is(JSON.parse((await repo.read('/runtime/layer.json')).toString()).mode, 'atomic', 'layer.json committed with its layer')
    t.is((await repo.select(`/request/pending/default/${PRELOADED}.json`)).length, 1, 'the request preloaded')
    await t.exception(build({ from: BOOT, work: a, name: 'boot' }), /exists/, 'never over an existing one')
  } finally {
    rmSync(a, { recursive: true, force: true })
    rmSync(b, { recursive: true, force: true })
  }
})

test('the boot mrepo running, without its packages: no service gate; its preloaded deploy refused (no boot protocol linked), answered; stopped', { timeout: 120000 }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    await build({ from: BOOT, work, name: 'boot' })
    const s = await start({ work, bundle: join(here, '..', 'mrepo-base-runtime', 'runtime.js') })
    t.ok(s?.pid, 'the runtime started')
    t.is(s.repository.storage, 'filesystem')
    t.is(s.repository.name, 'boot')
    t.alike(await send(work, req('rest', 'get', '/main')), { ok: true, value: { entries: ['layer.json'] } }, 'no service: no gate, a request answered')
    t.ok((await ask({ work, op: 'stop' }))?.stopping, 'asked to stop')
    for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
    t.absent(alive(s.pid), 'stopped')
    const r = await open(work)
    const repo = openRepo(r.backend)
    const done = JSON.parse((await repo.read(`/request/done/${PRELOADED}.json`)).toString()).value.value
    t.alike([done.protocol, done.action, done.uri, done.body], ['boot', 'deploy', '/host', { package: 'haiccing/base-package-runtime' }], 'the preloaded request: boot deploy /host, the runtime its target')
    t.is(done.error, 'no action: boot deploy', 'done, refused here: no boot protocol linked (the package\'s test runs it with its packages)')
    t.alike((await repo.select('/request/pending/default/*')).map(([p]) => p), ['/request/pending/default/layer.json'], 'nothing pending')
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
})

test('the structure written for the tests removed', () => rmSync(BOOT, { recursive: true, force: true }))

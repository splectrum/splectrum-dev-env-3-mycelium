import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { writer } from '../../mycelium-git/index.js'
import { commands } from '../index.js'
import { outbox } from '../../mycelium-repo-main/index.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const haicc = (...args) => spawnSync(Bare.argv[0], [join(here, 'haicc.js'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

test('version: the module and its version, as JSON', (t) => {
  const r = haicc('version')
  t.is(r.status, 0)
  const v = JSON.parse(String(r.stdout))
  t.is(v.name, 'haicc-base-cli')
  t.ok(/^\d+\.\d+\.\d+$/.test(v.version))
})

test('a bad call: exit 2, said on stderr', (t) => {
  t.is(haicc().status, 2)
  t.is(haicc('nothing-such').status, 2)
  t.ok(String(haicc('nothing-such').stderr).includes("no command 'nothing-such'"))
})

test('read: a level\'s repository by URI, read-only', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'cli-'))
  try {
    const store = await openStore({ storage: join(work, 'store') })
    const repo = await mrepos({ store }).create('level')
    const w = writer(repo.backend)
    const author = { name: 'test', email: 'test@localhost' }
    await w.createLayer('main', 'Create main', { author })
    const c = await w.change('main')
    await c.put('/notes/hello.md', Buffer.from('hello\n'))
    await c.commit('A note', { author })
    await store.close()
    const ctx = { work }
    t.alike((await commands.read(['/main/notes/hello.md'], ctx)).out, { uri: '/main/notes/hello.md', type: 'file', bytes: 6, text: 'hello\n' })
    t.alike((await commands.read(['/main'], ctx)).out.entries, ['notes'])
    t.alike((await commands.read(['/Main/Notes/HELLO.md'], ctx)).out.uri, '/main/notes/hello.md', 'case-insensitive: the stored name')
    t.is((await commands.read(['/main/none'], ctx)).code, 1)
    t.is((await commands.read(['not-absolute'], ctx)).code, 2, 'not a URI: a bad call')
    t.is((await commands.read(['/main'], { work: join(work, 'none') })).code, 1, 'no level there')
    const cli = haicc('read', '/main/notes/hello.md', `--work=${work}`)
    t.is(cli.status, 0)
    t.is(JSON.parse(String(cli.stdout)).text, 'hello\n')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('status: the level at a glance', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'cli-'))
  try {
    const author = { name: 'test', email: 'test@localhost' }
    const store = await openStore({ storage: join(work, 'store') })
    const repo = await mrepos({ store }).create('level')
    const w = writer(repo.backend)
    for (const l of ['main', 'packages', 'request/pending/default']) await w.createLayer(l, `Create ${l}`, { author })
    const c = await w.change('packages')
    await c.put('/manifest.json', Buffer.from(JSON.stringify({ sequence: 7, packages: { 'haiccing/base-package-x': { id: 'ab'.repeat(32), bytes: 12 } } })))
    await c.put('/haiccing/base-package-x.bundle', Buffer.from('a bundle'))
    await c.commit('Installed', { author })
    await store.close()
    const r = await commands.status([], { work })
    t.is(r.code, 0)
    t.is(r.out.level.repository, 'level')
    t.is(r.out.level.id, repo.id)
    t.alike(r.out.layers, ['/main', '/packages', '/request/pending/default'])
    t.is(r.out.manifest.sequence, 7)
    t.alike(r.out.packages, [{ package: 'haiccing/base-package-x', id: 'ab'.repeat(8), bytes: 12, deployed: false }])
    t.alike(r.out.boxes, { outbox: 0, inbox: { level: 0 } }, 'no messages waiting')
    t.is((await commands.status([], { work: join(work, 'none') })).code, 1)
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('message: validated at the terminal, into the level\'s outbox', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'cli-'))
  try {
    t.is((await commands.message(['/level/main/x', '{}'], { work })).code, 1, 'no level: not done')
    const store = await openStore({ storage: join(work, 'store') })
    await mrepos({ store }).create('level')
    await store.close()
    const r = haicc('message', '/Level//main/hello/', '{"text":"hi"}', `--work=${work}`)
    t.is(r.status, 0, String(r.stderr))
    const out = JSON.parse(String(r.stdout))
    t.is(out.to, '/level/main/hello', 'the URI canonical')
    t.alike(outbox(work).read(out.message), { to: '/level/main/hello', from: null, body: { text: 'hi' } }, 'from outside: from none')
    t.is((await commands.message(['/a_b', '{}'], { work })).code, 2, 'a bad URI: a bad call')
    t.is((await commands.message(['/level', '{nope'], { work })).code, 2, 'bad JSON: a bad call')
    t.is((await commands.message(['/level'], { work })).code, 2, 'no body: a bad call')
    t.is(outbox(work).list().length, 1, 'nothing bad written')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

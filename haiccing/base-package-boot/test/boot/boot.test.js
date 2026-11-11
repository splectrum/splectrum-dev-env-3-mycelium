// The boot, as the package runs it: bare run.js --work=<folder> (test/boot/run.js its entry). Built the
// first time, started by its preloaded request, a request posted to its
// inbox answered in its outbox, stopped; run again, opened as it was left.
// Everything from the package's own modules/.
import test from '../../modules/node_modules/brittle/index.js'
import { spawn, spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import fs, { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import os, { tmpdir } from '../../modules/node_modules/bare-os/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import { openRepo, p2pgitBackend } from '../../modules/pear-full-square/mycelium-git/index.js'
import { record, wrap, guid } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import { ask, gitdirOf, viewOf } from '../../modules/pear-full-square/mrepo-base-runtime/index.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PRELOADED = '7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f'
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0

// The sources: a folder holding the pinned Bare's tarball, as npm publishes
// it (npm pack, once a run; the tests skip what needs it when npm is not
// there).
const bare = JSON.parse(readFileSync(join(pkg, 'bare.json')))
const src = mkdtempSync(join(tmpdir(), 'boot-src-'))
const tarball = `bare-runtime-${os.platform()}-${os.arch()}-${bare.version}.tgz`
spawnSync('npm', ['pack', `bare-runtime-${os.platform()}-${os.arch()}@${bare.version}`, '--pack-destination', src], { stdio: 'ignore' })
const haveBare = existsSync(join(src, tarball))

function boot (work, extra = [`--sources=folder:${src}`, '--yes']) {
  return spawn(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: 'ignore' })
}
const ended = child => new Promise(resolve => child.on('exit', code => resolve(code)))
async function up (work) {
  for (let i = 0; i < 100; i++) { const s = await ask({ work, op: 'status' }); if (s) return s; await wait(100) }
  return null
}
// A request posted to the boot's inbox (its folder), its completed form read
// from the outbox.
async function send (work, form) {
  const core = record('/test', { api: 'boot', ...form }, guid())
  writeFileSync(join(viewOf(work, 'boot'), 'inbox', `${core.key}.json`), JSON.stringify(wrap('/boot/inbox', core)))
  const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
  for (let i = 0; i < 100; i++) {
    const back = await repo.read(`/outbox/${core.key}.json`).then(b => JSON.parse(b.toString()), () => null)
    if (back) return back.value.value
    await wait(100)
  }
  return null
}
async function stop (t, work, child) {
  t.ok((await ask({ work, op: 'stop' }))?.stopping, 'asked to stop')
  for (let i = 0; i < 100 && alive(child.pid); i++) await wait(100)
  t.absent(alive(child.pid), 'its process ended')
}

test('the prerequisites: one missing, the boot stops before writing anything', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-pre-'))
  try {
    t.is(await ended(boot(work, ['--sources=folder:/nowhere/at/all', '--yes'])), 3, 'a source missing: exit 3')
    t.absent(existsSync(join(work, 'mrepos')), 'nothing written')
    t.is(await ended(boot(work, [`--sources=folder:${src}`])), 3, 'Bare missing, no yes: exit 3')
    t.absent(existsSync(join(work, 'bare')), 'Bare not put in place')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the boot: Bare put in place, built, started, answering, stopped, run again', { timeout: 120000, skip: !haveBare }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    let child = boot(work)
    const s = await up(work)
    t.alike(s?.repository, { name: 'boot', storage: 'filesystem', id: null, key: null }, 'running: the boot mrepo, on the filesystem')
    t.is(readFileSync(join(work, 'bare', 'tarball.sha512'), 'utf8').trim(), bare.integrity, 'Bare put in place, as pinned')
    const service = await send(work, { protocol: 'rest', action: 'get', uri: '/runtime/service.json' })
    t.alike(service.output, { state: 'started', type: 'boot', package: 'haiccing/base-package-boot' }, 'started by its preloaded request')
    t.is((await send(work, { protocol: 'rest', action: 'put', uri: '/main/x.json', body: 1 })).error, 'not offered: rest put at /main/x.json', 'its API')
    await stop(t, work, child)

    child = boot(work)
    t.ok(await up(work), 'run again: opened as it was left')
    t.alike((await send(work, { protocol: 'rest', action: 'get', uri: '/main' })).output, { entries: ['layer.json'] })
    await stop(t, work, child)
    const repo = openRepo(p2pgitBackend(gitdirOf(work, 'boot'), { fs }))
    t.ok((await repo.select(`/request/done/${PRELOADED}.json`)).length, 'the preloaded request done, once')
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
})

test('the sources folder removed', () => rmSync(src, { recursive: true, force: true }))

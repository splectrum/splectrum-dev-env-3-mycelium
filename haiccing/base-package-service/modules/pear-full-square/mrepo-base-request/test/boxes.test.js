import test from 'brittle'
import fs, { mkdtempSync, rmSync, writeFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { p2pgitBackend, nativeBackend, openRepo, writer } from 'mycelium-git'
import { post, inboxFolder, layer, record, setting, gitdirOf, isWork, untaken } from '../index.js'

async function ctxOn (work, backend) {
  await backend.init()
  return { work, name: 'host', backend, repo: openRepo(backend), writer: writer(backend) }
}

test('the setting: the p2p host by default; a repository on native git by mrepo.json', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'setting-'))
  try {
    t.alike(setting(work), { storage: 'p2p', name: 'host' })
    t.absent(isWork(work), 'neither store/ nor mrepo.json: not a work folder')
    writeFileSync(join(work, 'mrepo.json'), JSON.stringify({ storage: 'git', name: 'pipeline' }))
    t.alike(setting(work), { storage: 'git', name: 'pipeline' })
    t.ok(isWork(work))
    t.is(gitdirOf(work, 'pipeline'), join(work, 'mrepos', 'pipeline', '.git'))
  } finally { rmSync(work, { recursive: true, force: true }) }
})

for (const engine of ['p2p-git', 'native']) {
  test(`post on ${engine}: a record committed into the inbox layer; the folder's new files committed; nothing removed`, async (t) => {
    const work = mkdtempSync(join(tmpdir(), 'post-'))
    try {
      const gitdir = join(work, 'mrepos', 'host', '.git')
      const ctx = await ctxOn(work, engine === 'native' ? nativeBackend(gitdir) : p2pgitBackend(gitdir, { fs }))
      const box = () => layer(ctx, 'inbox')
      t.alike(await post(ctx, record('/inbox', { a: 1 }), 'r1'), ['r1'], 'a record, its commit added')
      t.alike(await box().list(), ['r1'])
      t.alike((await box().read('r1')).value, { a: 1 })
      t.alike(await post(ctx, record('/inbox', { a: 1 }), 'r1'), [], 'the same name again: nothing')
      const f = inboxFolder(work).add(record('/inbox', { b: 2 }))
      const g = inboxFolder(work).add(record('/inbox', { c: 3 }))
      t.alike(await post(ctx), [f, g], 'the folder\'s new files, one commit')
      t.alike(await post(ctx), [], 'nothing new: nothing')
      t.alike(await box().list(), ['r1', f, g].sort())
      t.alike(inboxFolder(work).list(), [f, g], 'the folder kept (housekeeping later)')
      t.alike(await untaken(ctx), ['r1', f, g], 'none taken in yet, in the order they arrived')
      // The commit chain orders, not the names: z posted before a.
      await post(ctx, record('/inbox', { z: 1 }), 'zz')
      await post(ctx, record('/inbox', { a: 1 }), 'aa')
      t.alike((await untaken(ctx)).slice(-2), ['zz', 'aa'], 'by the commit chain: zz first, as it came first')
    } finally { rmSync(work, { recursive: true, force: true }) }
  })
}


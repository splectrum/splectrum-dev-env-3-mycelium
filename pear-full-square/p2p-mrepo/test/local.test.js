// A repository with its disk side (local): its atomic layers in the store,
// its non-atomic ones (request/*, execute/*) in <local>/<name>/.git, opened
// again with both.
import test from 'brittle'
import fs, { mkdtempSync, rmSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openStore } from 'p2p-store'
import { writer, p2pgitBackend } from '../../mycelium-git/index.js'
import { mrepos } from '../index.js'

const author = { name: 'test', email: 'test@localhost' }

test('local: the non-atomic layers on disk, in the repository\'s folder', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'p2p-mrepo-local-'))
  try {
    const local = join(dir, 'mrepos')
    let store = await openStore({ storage: join(dir, 'store') })
    const repo = await mrepos({ store, local }).create('host')
    const w = writer(repo.backend)
    await w.createLayer('main', 'Create main', { author })
    await w.createLayer('request/execute', 'Create request/execute', { author })
    t.ok(existsSync(join(local, 'host', '.git', 'HEAD')), 'its disk side: <local>/host/.git')
    t.alike((await p2pgitBackend(join(local, 'host', '.git'), { fs }).listBranches()).map(([n]) => n), ['request/execute'], 'on disk')
    await store.close()
    store = await openStore({ storage: join(dir, 'store') })
    const again = await mrepos({ store, local }).open('host')
    t.alike((await again.backend.listBranches()).map(([n]) => n), ['main', 'request/execute'], 'opened again: both')
    await store.close()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

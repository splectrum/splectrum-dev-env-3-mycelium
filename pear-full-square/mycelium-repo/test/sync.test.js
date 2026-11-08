import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fixture } from '../../mycelium-git/test/contract.js'
import { nativeBackend, isogitBackend, openRepo, writer } from '../../mycelium-git/index.js'
import { sync } from '../index.js'

// A command run to its end (Bare's bare-subprocess has no execFileSync): its
// output; a failure throws, with what it said.
const execFileSync = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: exit ${r.status}: ${String(r.stderr)}`); return r.stdout }

const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'
const empty = () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'remote-')), 'repo')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', dir])
  return dir
}
const put = async (b, branch, path, text) => {
  const c = await writer(b).change(branch)
  await c.put(path, text)
  return c.commit(`Put ${path}`, { author, time })
}

test('sync: created, same, advanced, remote ahead, diverged, remote only', async (t) => {
  const repo = nativeBackend(fixture())
  const remote = isogitBackend(empty())
  t.alike(await sync({ repo, remote }), {
    'execute/main': 'created', main: 'created', 'overlay/config': 'created', 'pending/default': 'created'
  })
  t.is((await openRepo(remote).read('/main/readme')).toString(), 'hello')

  await put(repo, 'main', '/a.md', 'a')
  await put(remote, 'overlay/config', '/theirs.md', 'theirs')
  await put(repo, 'pending/default', '/ours.md', 'ours')
  await put(remote, 'pending/default', '/theirs.md', 'theirs')
  await writer(remote).createLayer('data/elsewhere', 'Create', { author, time })
  t.alike(await sync({ repo, remote }), {
    'execute/main': 'same',
    main: 'advanced',
    'overlay/config': 'remote-ahead',
    'pending/default': 'diverged',
    'data/elsewhere': 'remote-only'
  })
  t.is((await openRepo(remote).read('/main/a.md')).toString(), 'a')
  t.alike(await openRepo(remote).select('/pending/default/ours.md'), [])
})

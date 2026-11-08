import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fixture } from '../../mycelium-git/test/contract.js'
import { nativeBackend, p2pgitBackend, openRepo, writer } from '../../mycelium-git/index.js'
import { publish, receive } from '../index.js'

// A command run to its end (Bare's bare-subprocess has no execFileSync): its
// output; a failure throws, with what it said.
const execFileSync = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: exit ${r.status}: ${String(r.stderr)}`); return r.stdout }

const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'
const empty = () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'product-')), 'repo')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', dir])
  return dir
}
const put = async (b, path, text) => {
  const c = await writer(b).change('main')
  await c.put(path, text)
  return c.commit(`Put ${path}`, { author, time })
}

test('publish, receive, then publish again: only forward', async (t) => {
  const repo = nativeBackend(fixture())
  const product = p2pgitBackend(empty())
  await put(repo, '/pkg/a.md', 'a')
  const first = await publish({ repo, pkg: 'pkg', product })
  t.is(Object.fromEntries(await repo.listBranches())['publish/pkg'], first.split)
  await receive({ product, message: 'Merge', author, time })
  t.is((await openRepo(product).read('/main/a.md')).toString(), 'a')

  await put(repo, '/other.md', 'not in the package')
  await put(repo, '/pkg/b.md', 'b')
  const second = await publish({ repo, pkg: 'pkg', product })
  t.not(second.split, first.split)
  t.is(second.copied, 3)
  await receive({ product, message: 'Merge', author, time })
  const files = (await openRepo(product).select('/main/*')).map(([p]) => p)
  t.alike(files, ['/main/a.md', '/main/b.md'])

  await t.exception(publish({ repo, pkg: 'nope', product }), /no folder: nope/)
})

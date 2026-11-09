import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import crypto from 'bare-crypto'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo } from '../../mycelium-git/index.js'
import { keyPair, sign } from '../../pkgm-base-manager/lib/sign.js'
import { boot, fetch, BOOT, HAICC, MYCELIUM, LEVEL } from '../index.js'

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex')
const put = (f, s) => { mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, s) }

// A setup: the boot's, HAICC's and a demo package (stand-in bundles), a shared addon, a signed manifest.
function setup (dir, key, { publicKey = key.publicKey } = {}) {
  const pkgs = {}
  for (const [repo, body] of [[BOOT, 'boot bundle'], [HAICC, 'haicc bundle'], [MYCELIUM, 'mycelium bundle'], ['haiccing/base-package-demo', 'demo bundle']]) {
    put(join(dir, `${repo}.bundle`), body)
    pkgs[repo] = { sha256: sha256(body), addons: [sha256('addon')] }
  }
  put(join(dir, 'addons', sha256('addon')), 'addon')
  put(join(dir, 'manifest.json'), JSON.stringify(sign({ sequence: 10, packages: pkgs }, key.secretKey)))
  put(join(dir, 'boot.json'), JSON.stringify({ publicKey, sources: [] }))
}

// The level's repository, read after the boot (its store closed).
async function level (work, fn) {
  const store = await openStore({ storage: join(work, 'store'), readOnly: true })
  try { return await fn(openRepo((await mrepos({ store }).open(LEVEL)).backend)) } finally { await store.close() }
}

test('boot: init, the repository and its layers; the packages layer as a source; its view under the mount point', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    const k = keyPair()
    setup(join(root, 'setup'), k)
    const work = join(root, 'work')
    const steps = []
    const r = await boot({ setup: join(root, 'setup'), work, say: e => steps.push(e.step), main: false })
    t.is(r.ok, true, r.why)
    t.alike(steps, ['machine', 'manifest', 'loaded', 'init', 'installed', 'deployed'])
    t.ok(/^[0-9a-f]{64}$/.test(r.key), 'the repository\'s key')
    await level(work, async repo => {
      const branches = (await repo.select('/*')).map(([p]) => p).concat((await repo.select('/*/*')).map(([p]) => p), (await repo.select('/*/*/*')).map(([p]) => p))
      for (const b of ['/main', '/packages', '/execute/main', '/request/pending/default', '/request/executing', '/request/done']) t.ok(branches.includes(b), b)
      t.is(JSON.parse((await repo.read('/packages/manifest.json')).toString()).sequence, 10, 'the manifest pinned in the layer')
      t.is((await repo.read(`/packages/${HAICC}.bundle`)).toString(), 'haicc bundle')
      t.is((await repo.read(`/packages/${BOOT}.bundle`)).toString(), 'boot bundle', 'the boot kept too (for a restore)')
      t.is((await repo.read(`/packages/${MYCELIUM}.bundle`)).toString(), 'mycelium bundle', 'the framework installed')
      t.is((await repo.read(`/packages/addons/${sha256('addon')}`)).toString(), 'addon')
      t.is((await repo.select('/main/*')).length, 0, 'main empty')
    })
    t.is(readFileSync(join(work, 'haicc', 'packages', `${HAICC}.bundle`), 'utf8'), 'haicc bundle', 'deployed: the layer\'s folder, at its URI\'s path')
    t.ok(existsSync(join(work, 'haicc', 'packages', 'addons', sha256('addon'))))
    t.is(readFileSync(join(work, 'haicc', 'packages', `${MYCELIUM}.bundle`), 'utf8'), 'mycelium bundle', 'the framework deployed')
    t.absent(existsSync(join(work, 'haicc', 'packages', `${BOOT}.bundle`)), 'the boot installed, not deployed')
    t.absent(existsSync(join(work, 'scratch')), 'no scratch left')
    t.is((await boot({ setup: join(root, 'setup'), work, main: false })).ok, false, 'booted already: not again')
    // Lazily, later: from the manifest pinned in the repository.
    t.is((await fetch({ setup: join(root, 'setup'), work, repo: 'haiccing/base-package-demo' })).ok, true)
    await level(work, async repo => {
      t.is((await repo.read('/packages/haiccing/base-package-demo.bundle')).toString(), 'demo bundle')
      t.is(JSON.parse((await repo.read('/packages/manifest.json')).toString()).sequence, 10, 'the pin untouched')
    })
    t.ok(existsSync(join(work, 'haicc', 'packages', 'haiccing', 'base-package-demo.bundle')))
    t.is((await fetch({ setup: join(root, 'setup'), work, repo: 'haiccing/base-package-none' })).ok, false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('boot refuses another publisher\'s manifest, and creates nothing', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    setup(join(root, 'setup'), keyPair(), { publicKey: keyPair().publicKey })
    const r = await boot({ setup: join(root, 'setup'), work: join(root, 'work'), main: false })
    t.is(r.ok, false)
    t.absent(existsSync(join(root, 'work', 'store')), 'no store made')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import crypto from 'bare-crypto'
import { keyPair, sign } from '../../pkgm-base-manager/lib/sign.js'
import { boot, fetch, HAICC } from '../index.js'

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex')
const put = (f, s) => { mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, s) }

// A setup: two packages (HAICC's and another), a shared addon, a signed manifest.
function setup (dir, key, { sequence = 10, conf = {} } = {}) {
  const pkgs = {}
  for (const [repo, body] of [[HAICC, 'haicc bundle'], ['base-package-demo', 'demo bundle']]) {
    put(join(dir, `${repo}.bundle`), body)
    pkgs[repo] = { sha256: sha256(body), addons: [sha256('addon')] }
  }
  put(join(dir, 'addons', sha256('addon')), 'addon')
  put(join(dir, 'manifest.json'), JSON.stringify(sign({ sequence, packages: pkgs }, key.secretKey)))
  put(join(dir, 'boot.json'), JSON.stringify({ publicKey: key.publicKey, sources: [], ...conf }))
}

test('boot: the manifest loaded, checked, pinned; HAICC\'s package into the scope', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    const k = keyPair()
    setup(join(root, 'setup'), k)
    const steps = []
    const r = boot({ setup: join(root, 'setup'), work: join(root, 'work'), say: e => steps.push(e.step) })
    t.is(r.ok, true, r.why)
    t.alike(steps, ['machine', 'manifest', 'loaded'])
    t.is(JSON.parse(readFileSync(join(root, 'work', 'manifest.json'), 'utf8')).sequence, 10, 'pinned')
    t.is(readFileSync(join(root, 'work', 'scope', `${HAICC}.bundle`), 'utf8'), 'haicc bundle')
    t.ok(existsSync(join(root, 'work', 'scope', 'addons', sha256('addon'))))
    t.absent(existsSync(join(root, 'work', 'scope', 'base-package-demo.bundle')), 'lazy: only what booting needs')
    t.absent(existsSync(join(root, 'work', 'scratch')), 'no scratch left')
    // Lazily, later: from the pinned manifest.
    t.is(fetch({ setup: join(root, 'setup'), work: join(root, 'work'), repo: 'base-package-demo' }).ok, true)
    t.ok(existsSync(join(root, 'work', 'scope', 'base-package-demo.bundle')))
    t.is(fetch({ setup: join(root, 'setup'), work: join(root, 'work'), repo: 'base-package-none' }).ok, false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('boot refuses: another publisher\'s manifest; one older than pinned', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boot-'))
  try {
    const k = keyPair()
    setup(join(root, 'setup'), k, { sequence: 10 })
    put(join(root, 'setup', 'boot.json'), JSON.stringify({ publicKey: keyPair().publicKey, sources: [] }))
    t.is(boot({ setup: join(root, 'setup'), work: join(root, 'work') }).ok, false, 'not the publisher\'s key')
    put(join(root, 'setup', 'boot.json'), JSON.stringify({ publicKey: k.publicKey, sources: [] }))
    put(join(root, 'work', 'manifest.json'), JSON.stringify({ sequence: 11, packages: {} }))
    t.is(boot({ setup: join(root, 'setup'), work: join(root, 'work') }).ok, false, 'older than pinned: no going back')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import crypto from 'bare-crypto'
import { keyPair, sign, verify, canonical } from '../lib/sign.js'
import { loadManifest, loadPackage } from '../lib/sources.js'

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex')
const put = (f, s) => { mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, s) }

// A source folder: a package's bundle, two addons, a manifest (signed with `key`).
function source (dir, key, { sequence = 1, bundle = 'the bundle', tamper = false } = {}) {
  put(join(dir, 'base-package-x.bundle'), tamper ? 'not the bundle' : bundle)
  put(join(dir, 'addons', sha256('addon a')), 'addon a')
  put(join(dir, 'addons', sha256('addon b')), 'addon b')
  const m = { sequence, packages: { 'base-package-x': { sha256: sha256(bundle), addons: [sha256('addon a'), sha256('addon b')] } } }
  put(join(dir, 'manifest.json'), JSON.stringify(key ? sign(m, key.secretKey) : m))
  return m
}

test('sign and verify: the publisher\'s signature over the canonical form', (t) => {
  const k = keyPair()
  const s = sign({ b: 1, a: [2, { d: 3, c: 4 }] }, k.secretKey)
  t.ok(verify(s, k.publicKey))
  t.ok(verify({ a: [2, { c: 4, d: 3 }], b: 1, signature: s.signature }, k.publicKey), 'key order does not matter')
  t.absent(verify({ ...s, b: 2 }, k.publicKey), 'a changed manifest refused')
  t.absent(verify(s, keyPair().publicKey), 'another key refused')
  t.absent(verify({ b: 1 }, k.publicKey), 'unsigned refused')
  t.is(canonical({ b: 1, a: 'x' }), '{"a":"x","b":1}')
})

test('loadManifest: the newest signed one, never older than seen', (t) => {
  const k = keyPair()
  const root = mkdtempSync(join(tmpdir(), 'sources-'))
  try {
    source(join(root, 'old'), k, { sequence: 3 })
    source(join(root, 'new'), k, { sequence: 5 })
    source(join(root, 'unsigned'), null, { sequence: 9 })
    source(join(root, 'other'), keyPair(), { sequence: 7 })
    const sources = ['old', 'unsigned', 'other', 'new'].map(n => ({ kind: 'folder', path: join(root, n) }))
    const scratch = join(root, 'scratch')
    t.is(loadManifest({ sources, publicKey: k.publicKey, scratch }).sequence, 5, 'the newest validly signed')
    t.is(loadManifest({ sources, publicKey: k.publicKey, scratch, atLeast: 6 }), null, 'none: all older than seen')
    t.is(loadManifest({ sources: [{ kind: 'folder', path: join(root, 'missing') }], publicKey: k.publicKey, scratch }), null)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('loadPackage: checked by hash, from the first source that matches; addons only if missing', (t) => {
  const k = keyPair()
  const root = mkdtempSync(join(tmpdir(), 'sources-'))
  try {
    source(join(root, 'bad'), k, { tamper: true })
    const m = source(join(root, 'good'), k)
    const sources = [{ kind: 'folder', path: join(root, 'bad') }, { kind: 'folder', path: join(root, 'good') }]
    const to = join(root, 'scope')
    const r = loadPackage({ sources, manifest: m, repo: 'base-package-x', to, scratch: join(root, 'scratch') })
    t.is(readFileSync(join(to, 'base-package-x.bundle'), 'utf8'), 'the bundle', 'the tampered copy passed over')
    t.alike(readdirSync(join(to, 'addons')).sort(), [sha256('addon a'), sha256('addon b')].sort())
    t.is(r.fetched.length, 3)
    t.is(loadPackage({ sources, manifest: m, repo: 'base-package-x', to, scratch: join(root, 'scratch') }).fetched.length, 0, 'again: nothing fetched')
    t.exception(() => loadPackage({ sources: sources.slice(0, 1), manifest: m, repo: 'base-package-x', to: join(root, 'scope2'), scratch: join(root, 'scratch') }), /no source has/, 'only a tampered copy: refused')
    t.exception(() => loadPackage({ sources, manifest: m, repo: 'base-package-y', to, scratch: join(root, 'scratch') }), /not in the manifest/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('a web source: downloaded with curl (here a file:// URL)', (t) => {
  const k = keyPair()
  const root = mkdtempSync(join(tmpdir(), 'sources-'))
  try {
    source(join(root, 'web'), k, { sequence: 2 })
    const sources = [{ kind: 'web', url: 'file://' + join(root, 'web') }]
    const m = loadManifest({ sources, publicKey: k.publicKey, scratch: join(root, 'scratch') })
    t.is(m?.sequence, 2)
    loadPackage({ sources, manifest: m, repo: 'base-package-x', to: join(root, 'scope'), scratch: join(root, 'scratch') })
    t.ok(existsSync(join(root, 'scope', 'base-package-x.bundle')))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

import test from 'brittle'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync, chmodSync } from 'bare-fs'
import { join } from 'bare-path'
import os, { tmpdir } from 'bare-os'
import { spawnSync } from 'bare-subprocess'
import { check, parseSource, inContainer, bareOf, acceptable, BARE_ORG } from '../lib/prerequisites.js'

// Bare's tarball for putting it in place: the version running this test, as
// npm publishes it (npm view: its sha512; npm pack: the tarball), into a
// folder source; what needs it skipped without npm (the module's tests stand
// on their own: no development repository needed).
const version = Bare.version.replace(/^v/, '')
const viewed = spawnSync('npm', ['view', `bare-runtime-${os.platform()}-${os.arch()}@${version}`, 'dist.integrity'], { stdio: ['ignore', 'pipe', 'ignore'] })
const BARE = { version, integrity: viewed.status === 0 ? viewed.stdout.toString().trim() : null }
const TARBALL = `bare-runtime-${os.platform()}-${os.arch()}-${BARE.version}.tgz`

test('platform, work, sources', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'pre-'))
  try {
    const sources = [parseSource(`folder:${work}`)]
    const ok = await check([{ check: 'platform' }, { check: 'work' }, { check: 'sources' }], { work, name: 'boot', sources })
    t.ok(ok.ok, 'all there')
    t.alike(ok.results.map(r => r.check), ['platform', 'work', 'sources'])
    t.absent((await check([{ check: 'platform', platforms: ['nowhere-x1'] }], { work })).ok, 'another platform: missing')
    writeFileSync(join(work, 'mrepo.json'), JSON.stringify({ storage: 'filesystem', name: 'host' }))
    const other = await check([{ check: 'work' }], { work, name: 'boot' })
    t.absent(other.ok, 'another mrepo there: refused')
    t.ok(/another mrepo \(host is there\)/.test(other.results[0].missing))
    t.ok((await check([{ check: 'work' }], { work, name: 'host' })).ok, 'the same mrepo there: fine')
    const gone = await check([{ check: 'sources' }], { work, sources: [parseSource('folder:/nowhere/at/all')] })
    t.absent(gone.ok, 'a source folder missing: refused')
    t.exception(() => parseSource('ftp:x'), /not a source/)
    t.absent((await check([{ check: 'work' }], { work: '/', name: 'boot' })).ok, 'the filesystem\'s root: refused')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('bare: missing, not fixed without a yes; put in place from a folder source, checked; there next time', { timeout: 120000, skip: !BARE.integrity }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'pre-bare-'))
  const src = mkdtempSync(join(tmpdir(), 'pre-src-'))
  try {
    const list = [{ check: 'bare', fix: true }]
    const no = await check(list, { work, sources: [parseSource(`folder:${src}`)], bare: BARE, ask: async () => false })
    t.absent(no.ok, 'missing, refused the fix: stops')
    t.absent(existsSync(bareOf(work)), 'nothing written')
    const empty = await check(list, { work, sources: [parseSource(`folder:${src}`)], bare: BARE, yes: true })
    t.ok(/not in the sources/.test(empty.results[0].missing), 'not in the sources: said')
    // npm's tarball, packed from the installed copy as the registry has it
    // by its organisation, as a source holds it
    mkdirSync(join(src, BARE_ORG), { recursive: true })
    const p = spawnSync('npm', ['pack', `bare-runtime-${os.platform()}-${os.arch()}@${BARE.version}`, '--pack-destination', join(src, BARE_ORG)], { stdio: 'ignore' })
    if (p.status !== 0 || !existsSync(join(src, BARE_ORG, TARBALL))) { t.comment('npm pack not available: skipped'); return }
    const bad = { ...BARE, integrity: 'sha512-AAAA' }
    const wrong = await check(list, { work, sources: [parseSource(`folder:${src}`)], bare: bad, yes: true })
    t.ok(/not as pinned/.test(wrong.results[0].missing), 'not as pinned: refused')
    const put = await check(list, { work, sources: [parseSource(`folder:${src}`)], bare: BARE, yes: true })
    t.ok(put.ok, 'put in place')
    t.ok(put.results[0].fixed)
    const v = spawnSync(bareOf(work), ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] })
    t.is(v.stdout.toString().trim(), `v${BARE.version}`, 'it runs: the pinned version')
    const again = await check(list, { work, sources: [], bare: BARE })
    t.ok(again.ok && !again.results[0].fixed, 'there next time: kept')
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(src, { recursive: true, force: true })
  }
})

test('bare: an installed one on the PATH, at the pinned major, the same or newer; recorded, used next time', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'pre-inst-'))
  const bins = mkdtempSync(join(tmpdir(), 'pre-bins-'))
  // a `bare` that only answers its version, one a folder
  const fake = v => { const d = join(bins, v); mkdirSync(d); writeFileSync(join(d, 'bare'), `#!/bin/sh\necho v${v}\n`); chmodSync(join(d, 'bare'), 0o755); return d }
  try {
    t.ok(acceptable('1.36.0', '1.35.0') && acceptable('v1.35.0', '1.35.0') && acceptable('1.35.2', '1.35.0'), 'the same or newer: accepted')
    t.absent(acceptable('1.24.2', '1.35.0') || acceptable('1.34.9', '1.35.0') || acceptable('2.0.0', '1.35.0') || acceptable('x', '1.35.0'), 'older, another major, no version: refused')
    const [old, other, good] = [fake('1.24.2'), fake('2.1.0'), fake('1.40.1')]
    const list = [{ check: 'bare', fix: true }]
    const ctx = { work, sources: [], bare: BARE, ask: async () => false }
    const none = await check(list, { ...ctx, path: [old, other].join(':') })
    t.absent(none.ok, 'only an older one and another major: missing')
    t.absent(existsSync(join(work, 'bare.json')), 'nothing recorded')
    const found = await check(list, { ...ctx, path: [old, good, other].join(':') })
    t.ok(found.ok && !found.results[0].fixed, 'a newer 1.x on the PATH: used, nothing put in place')
    t.alike(found.results[0].value, { bare: join(good, 'bare'), version: '1.40.1', installed: true })
    t.is(bareOf(work), join(good, 'bare'), 'recorded: the one the mrepo runs on')
    t.absent(existsSync(join(work, 'bare')), 'no Bare of its own')
    // npm's wrapper: asked, it names the binary it runs; that one recorded
    const real = fake('1.40.2')
    const wrapper = join(bins, 'wrapper'); mkdirSync(wrapper)
    writeFileSync(join(wrapper, 'bare'), `#!/bin/sh\n[ "$1" = -e ] && echo ${join(real, 'bare')} || echo v1.40.2\n`); chmodSync(join(wrapper, 'bare'), 0o755)
    const w = mkdtempSync(join(tmpdir(), 'pre-wrap-'))
    try {
      const viaWrapper = await check(list, { ...ctx, work: w, path: wrapper })
      t.is(viaWrapper.results[0].value.bare, join(real, 'bare'), 'a wrapper on the PATH: the binary it runs recorded')
    } finally { rmSync(w, { recursive: true, force: true }) }
    const again = await check(list, { ...ctx })
    t.ok(again.ok && again.results[0].value.installed, 'next time: the recorded one, no PATH needed')
    rmSync(good, { recursive: true, force: true })
    const gone = await check(list, { ...ctx })
    t.absent(gone.ok, 'the recorded one gone: missing again (and the fix offered)')
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(bins, { recursive: true, force: true })
  }
})

test('docker: only where its condition holds', async (t) => {
  const r = await check([{ check: 'docker', when: 'not-in-container' }], {})
  if (inContainer()) t.is(r.results[0].skipped, 'not-in-container', 'in a container: skipped')
  else t.ok('ok' in r.results[0], `checked: ${JSON.stringify(r.results[0])}`)
})

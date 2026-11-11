import test from 'brittle'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import os, { tmpdir } from 'bare-os'
import { spawnSync } from 'bare-subprocess'
import { check, parseSource, inContainer, bareOf, BARE_ORG } from '../lib/prerequisites.js'

// Bare's tarball for putting it in place: from this repository's node_modules
// (the lockfile's pin), packed as npm publishes it, into a folder source.
const dev = join(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '..', '..', '..')
const lock = JSON.parse(readFileSync(join(dev, 'package-lock.json'), 'utf8'))
const pin = lock.packages['node_modules/bare-runtime-linux-x64']
const BARE = { version: pin.version, integrity: pin.integrity }
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

test('bare: missing, not fixed without a yes; put in place from a folder source, checked; there next time', { timeout: 120000 }, async (t) => {
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

test('docker: only where its condition holds', async (t) => {
  const r = await check([{ check: 'docker', when: 'not-in-container' }], {})
  if (inContainer()) t.is(r.results[0].skipped, 'not-in-container', 'in a container: skipped')
  else t.ok('ok' in r.results[0], `checked: ${JSON.stringify(r.results[0])}`)
})

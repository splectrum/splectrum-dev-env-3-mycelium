// haicc-base-boot: the cold boot, as a library (boot.js is its command line,
// the boot package's entry). From a setup (a source folder: the packages'
// bundles, their addons by hash, the publisher's signed manifest; with Bare
// and boot.json: the publisher's public key, the other sources) into a
// level: its mycelium repository, created (docs/design/structure.md, "The
// cold boot"; repositories.md):
//   boot({ setup, work })          the machine checked; the manifest loaded from
//                                  the sources (the setup's own folder first),
//                                  its signature checked; the boot's and HAICC's
//                                  packages loaded, each checked by hash; init:
//                                  the store (<work>/store) and the repository
//                                  (`level`) created, its layers main,
//                                  packages/default, execute/main,
//                                  request/pending/default, request/executing,
//                                  request/done; packages/default holding the
//                                  pinned manifest, the bundles, their addons
//                                  (laid out as a source); HAICC's package
//                                  deployed into the scope (<work>/scope),
//                                  read back from the repository
//   fetch({ setup, work, repo })   another package, lazily, as the pinned
//                                  manifest lists it: into packages/default and
//                                  the scope
// Each returns its result; `say` gets each step as it happens. A level
// already booted is not booted again (a restore comes later).
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import os from 'bare-os'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { writer, openRepo } from '../mycelium-git/index.js'
import { loadManifest, loadPackage } from '../pkgm-base-manager/lib/sources.js'

export const BOOT = 'base-package-boot'
export const HAICC = 'base-package-haicc'
export const LEVEL = 'level'
export const LAYERS = ['main', 'packages/default', 'request/pending/default', 'request/executing', 'request/done']
const PACKAGES = 'packages/default'
const author = { name: 'haicc-base-boot', email: 'haicc-base-boot@localhost' }

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

// The sources, in order: the setup's own folder, then boot.json's.
export function sourcesOf (setup) {
  const conf = readJson(join(setup, 'boot.json'))
  return { conf, sources: [{ kind: 'folder', path: setup }, ...(conf.sources || [])] }
}

export function machine () {
  const platform = `${os.platform()}-${os.arch()}`
  return { platform, ok: platform === 'linux-x64' }
}

// A package's files (its bundle, its addons), as staged, committed into the
// packages layer in one change.
// The manifest itself only when it is pinned (init); fetch only adds files.
async function commitPackages (backend, staged, repos, manifest, message, { pin = false } = {}) {
  const c = await writer(backend).change(PACKAGES)
  if (pin) await c.put('/manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'))
  for (const repo of repos) {
    await c.put(`/${repo}.bundle`, readFileSync(join(staged, `${repo}.bundle`)))
    for (const a of manifest.packages[repo].addons || []) await c.put(`/addons/${a}`, readFileSync(join(staged, 'addons', a)))
  }
  return c.commit(message, { author })
}

// A package deployed into the scope: its bundle and its addons, read from
// the packages layer (install-internal: the folder Bare runs from).
async function deploy (backend, manifest, repo, scope) {
  const r = openRepo(backend)
  mkdirSync(join(scope, 'addons'), { recursive: true })
  writeFileSync(join(scope, `${repo}.bundle`), await r.read(`/${PACKAGES}/${repo}.bundle`))
  for (const a of manifest.packages[repo].addons || []) if (!existsSync(join(scope, 'addons', a))) writeFileSync(join(scope, 'addons', a), await r.read(`/${PACKAGES}/addons/${a}`))
  return join(scope, `${repo}.bundle`)
}

export async function boot ({ setup, work, say = () => {} }) {
  const m = machine()
  say({ step: 'machine', ...m })
  if (!m.ok) return { ok: false, why: `not supported: ${m.platform} (linux-x64 only, for now)` }
  if (existsSync(join(work, 'store'))) return { ok: false, why: `booted already: ${work} (a restore comes later)` }
  mkdirSync(work, { recursive: true })
  const scratch = join(work, 'scratch')
  try {
    const { conf, sources } = sourcesOf(setup)
    const manifest = loadManifest({ sources, publicKey: conf.publicKey, scratch })
    if (!manifest) return { ok: false, why: 'no source has a manifest signed by the publisher' }
    say({ step: 'manifest', sequence: manifest.sequence, packages: Object.keys(manifest.packages) })
    const staged = join(scratch, 'staged')
    for (const repo of [BOOT, HAICC]) loadPackage({ sources, manifest, repo, to: staged, scratch: join(scratch, 'fetch') })
    say({ step: 'loaded', packages: [BOOT, HAICC] })
    // init: the store, the repository, its layers.
    const store = await openStore({ storage: join(work, 'store') })
    try {
      const repo = await mrepos({ store }).create(LEVEL)
      const w = writer(repo.backend)
      for (const l of LAYERS) await w.createLayer(l, `Create ${l}`, { author })
      await w.createExecution('main')
      say({ step: 'init', repository: LEVEL, id: repo.id, key: repo.key, layers: [...LAYERS, 'execute/main'] })
      const commit = await commitPackages(repo.backend, staged, [BOOT, HAICC], manifest, `Installed from the setup: manifest ${manifest.sequence}`, { pin: true })
      say({ step: 'installed', layer: PACKAGES, commit, packages: [BOOT, HAICC] })
      const bundle = await deploy(repo.backend, manifest, HAICC, join(work, 'scope'))
      say({ step: 'deployed', package: HAICC })
      return { ok: true, sequence: manifest.sequence, id: repo.id, key: repo.key, bundle }
    } finally { await store.close() }
  } finally { rmSync(scratch, { recursive: true, force: true }) }
}

export async function fetch ({ setup, work, repo: name, say = () => {} }) {
  if (!existsSync(join(work, 'store'))) return { ok: false, why: 'not booted: no repository' }
  const scratch = join(work, 'scratch')
  const store = await openStore({ storage: join(work, 'store') })
  try {
    const repo = await mrepos({ store }).open(LEVEL)
    const manifest = JSON.parse((await openRepo(repo.backend).read(`/${PACKAGES}/manifest.json`)).toString())
    if (!manifest.packages[name]) return { ok: false, why: `not in the pinned manifest: ${name}` }
    const { sources } = sourcesOf(setup)
    const staged = join(scratch, 'staged')
    const r = loadPackage({ sources, manifest, repo: name, to: staged, scratch: join(scratch, 'fetch') })
    say({ step: 'loaded', package: name, fetched: r.fetched.length })
    const commit = await commitPackages(repo.backend, staged, [name], manifest, `Installed ${name}: manifest ${manifest.sequence}`)
    say({ step: 'installed', layer: PACKAGES, commit, package: name })
    const bundle = await deploy(repo.backend, manifest, name, join(work, 'scope'))
    return { ok: true, bundle }
  } finally {
    await store.close()
    rmSync(scratch, { recursive: true, force: true })
  }
}

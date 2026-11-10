// haicc-base-boot: the boot (the service protocol's boot), as a library (boot.js is its command line,
// the boot package's entry). From a setup (a source folder: the packages'
// bundles, their addons by hash, the publisher's signed manifest; with Bare
// and boot.json: the publisher's public key, the other sources) into a
// host: its mycelium repository, created (docs/design/structure.md,
// "Boot"; repositories.md):
//   boot({ setup, work })          the machine checked; the manifest loaded from
//                                  the sources (the setup's own folder first),
//                                  its signature checked; the boot's and HAICC's
//                                  packages loaded, each checked by hash; init:
//                                  the store (<work>/store) and the repository
//                                  (`host`, of type haicc) created, its layers main,
//                                  packages, execute/main,
//                                  request/pending/default, request/executing,
//                                  request/done; packages holding the pinned
//                                  manifest, the bundles by [org]/[package],
//                                  their addons (laid out as a source): the
//                                  boot's, HAICC's and mrepo's; HAICC's and
//                                  mrepo's bundles copied out (the replicated
//                                  layer's files: <work>/mrepos/host/packages),
//                                  read back from the repository; then the
//                                  host's runtime started (mrepo-base-runtime)
//   fetch({ setup, work, repo })   another package, lazily, as the pinned
//                                  manifest lists it ([org]/[package]): into
//                                  the packages layer and its files
// Each returns its result; `say` gets each step as it happens. A host
// already booted is not booted again (a restore comes later).
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import os from 'bare-os'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { writer, openRepo } from '../mycelium-git/index.js'
import { loadManifest, loadPackage } from '../pkgm-base-manager/lib/sources.js'
import { start as startRuntime, HOST, viewOf } from '../mrepo-base-runtime/index.js'

export const BOOT = 'haiccing/base-package-boot'
export const HAICC = 'haiccing/base-package-haicc'
export const MREPO = 'haiccing/base-package-mrepo'
// Installed at init, and deployed into the layer's view (what runs).
export const INSTALL = [BOOT, HAICC, MREPO]
export const DEPLOY = [HAICC, MREPO]
export { HOST }
export const LAYERS = ['main', 'packages', 'request/pending/default', 'request/executing', 'request/done']
const PACKAGES = 'packages'
// The repository's root, viewed: <work>/haicc (its mount point).
export const VIEW = viewOf('', HOST)
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

// A package deployed: its bundle and its addons, read from the packages
// layer into the layer's view, at the same path as its URI under the mount
// point (Bare runs the bundle from there, the addons store two levels up).
async function deploy (backend, manifest, repo, folder) {
  const r = openRepo(backend)
  mkdirSync(join(folder, 'addons'), { recursive: true })
  mkdirSync(join(folder, repo, '..'), { recursive: true })
  writeFileSync(join(folder, `${repo}.bundle`), await r.read(`/${PACKAGES}/${repo}.bundle`))
  for (const a of manifest.packages[repo].addons || []) if (!existsSync(join(folder, 'addons', a))) writeFileSync(join(folder, 'addons', a), await r.read(`/${PACKAGES}/addons/${a}`))
  return join(folder, `${repo}.bundle`)
}

export async function boot ({ setup, work, say = () => {}, runtime = true }) {
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
    for (const repo of INSTALL) loadPackage({ sources, manifest, repo, to: staged, scratch: join(scratch, 'fetch') })
    say({ step: 'loaded', packages: INSTALL })
    // init: the store, the repository, its layers.
    let result
    const store = await openStore({ storage: join(work, 'store') })
    try {
      const repo = await mrepos({ store }).create(HOST)
      const w = writer(repo.backend)
      for (const l of LAYERS) await w.createLayer(l, `Create ${l}`, { author })
      await w.createExecution('main')
      say({ step: 'init', repository: HOST, id: repo.id, key: repo.key, layers: [...LAYERS, 'execute/main'] })
      const commit = await commitPackages(repo.backend, staged, INSTALL, manifest, `Installed from the setup: manifest ${manifest.sequence}`, { pin: true })
      say({ step: 'installed', layer: PACKAGES, commit, packages: INSTALL })
      let bundle = null
      for (const p of DEPLOY) { const b = await deploy(repo.backend, manifest, p, join(work, VIEW, PACKAGES)); if (p === HAICC) bundle = b }
      say({ step: 'deployed', packages: DEPLOY })
      result = { ok: true, sequence: manifest.sequence, id: repo.id, key: repo.key, bundle }
    } finally { await store.close() }
    // The host's runtime (mrepo-base-runtime): started detached, the
    // store's single writer from now on (the boot's hold closed above).
    if (runtime) {
      const r = await startRuntime({ work })
      say({ step: 'runtime', running: Boolean(r), pid: r?.pid ?? null })
      if (!r) return { ...result, ok: false, why: 'the runtime did not start (see log/runtime.log)' }
      result.runtime = { pid: r.pid }
    }
    return result
  } finally { rmSync(scratch, { recursive: true, force: true }) }
}

export async function fetch ({ setup, work, repo: name, say = () => {} }) {
  if (!existsSync(join(work, 'store'))) return { ok: false, why: 'not booted: no repository' }
  const scratch = join(work, 'scratch')
  const store = await openStore({ storage: join(work, 'store') })
  try {
    const repo = await mrepos({ store }).open(HOST)
    const manifest = JSON.parse((await openRepo(repo.backend).read(`/${PACKAGES}/manifest.json`)).toString())
    if (!manifest.packages[name]) return { ok: false, why: `not in the pinned manifest: ${name}` }
    const { sources } = sourcesOf(setup)
    const staged = join(scratch, 'staged')
    const r = loadPackage({ sources, manifest, repo: name, to: staged, scratch: join(scratch, 'fetch') })
    say({ step: 'loaded', package: name, fetched: r.fetched.length })
    const commit = await commitPackages(repo.backend, staged, [name], manifest, `Installed ${name}: manifest ${manifest.sequence}`)
    say({ step: 'installed', layer: PACKAGES, commit, package: name })
    const bundle = await deploy(repo.backend, manifest, name, join(work, VIEW, PACKAGES))
    return { ok: true, bundle }
  } finally {
    await store.close()
    rmSync(scratch, { recursive: true, force: true })
  }
}

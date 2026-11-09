// haicc-base-boot: the cold boot, as a library (boot.js is its command line,
// the boot package's entry). From a setup (a source folder: the packages'
// bundles, their addons by hash, the manifest; with Bare and boot.json:
// the publisher's public key, the other sources) into a work folder:
//   boot({ setup, work })            the machine checked; the manifest loaded
//                                    from the sources (the setup's own folder
//                                    first), its signature and sequence checked,
//                                    pinned (<work>/manifest.json); HAICC's
//                                    package loaded into the scope (<work>/scope)
//   fetch({ setup, work, repo })     another package, lazily, as the pinned
//                                    manifest lists it
// Each returns its result; `say` gets each step as it happens.
// (Step 2, part 1 of the rebuild: the repository and init come next; the
// pinned manifest and the scope then live in it.)
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import os from 'bare-os'
import { loadManifest, loadPackage } from '../pkgm-base-manager/lib/sources.js'

export const HAICC = 'base-package-haicc'

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

export function boot ({ setup, work, say = () => {} }) {
  const m = machine()
  say({ step: 'machine', ...m })
  if (!m.ok) return { ok: false, why: `not supported: ${m.platform} (linux-x64 only, for now)` }
  mkdirSync(work, { recursive: true })
  const { conf, sources } = sourcesOf(setup)
  const pinned = join(work, 'manifest.json')
  const atLeast = existsSync(pinned) ? readJson(pinned).sequence : 0
  const manifest = loadManifest({ sources, publicKey: conf.publicKey, scratch: join(work, 'scratch'), atLeast })
  if (!manifest) return { ok: false, why: 'no source has a manifest signed by the publisher (and not older than the one pinned)' }
  writeFileSync(pinned, JSON.stringify(manifest, null, 2) + '\n')
  say({ step: 'manifest', sequence: manifest.sequence, packages: Object.keys(manifest.packages) })
  const r = loadPackage({ sources, manifest, repo: HAICC, to: join(work, 'scope'), scratch: join(work, 'scratch') })
  say({ step: 'loaded', package: HAICC, fetched: r.fetched.length })
  rmSync(join(work, 'scratch'), { recursive: true, force: true })
  return { ok: true, sequence: manifest.sequence, bundle: r.bundle }
}

export function fetch ({ setup, work, repo, say = () => {} }) {
  const pinned = join(work, 'manifest.json')
  if (!existsSync(pinned)) return { ok: false, why: 'not booted: no pinned manifest' }
  const manifest = readJson(pinned)
  if (!manifest.packages[repo]) return { ok: false, why: `not in the pinned manifest: ${repo}` }
  const { sources } = sourcesOf(setup)
  const r = loadPackage({ sources, manifest, repo, to: join(work, 'scope'), scratch: join(work, 'scratch') })
  say({ step: 'loaded', package: repo, fetched: r.fetched.length })
  rmSync(join(work, 'scratch'), { recursive: true, force: true })
  return { ok: true, bundle: r.bundle }
}

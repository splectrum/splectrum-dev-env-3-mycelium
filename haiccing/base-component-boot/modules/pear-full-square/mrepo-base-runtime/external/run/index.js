// run: runtime/run /packages/<org>/<package><target>, an entry of a package
// the mrepo has linked, through that package's dispatcher (README.md beside it).
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'bare-fs'
import crypto from 'bare-crypto'
import { tmpdir } from 'bare-os'
import { join } from 'bare-path'
import { pathToFileURL } from 'bare-url'

function target (uri) {
  const m = uri.match(/^\/packages\/([^/]+)\/([^/]+)(\/.*)?$/)
  if (!m) throw new Error(`not a package's entry: ${uri} (/packages/<org>/<package>/<target>)`)
  return { pkg: `${m[1]}/${m[2]}`, target: m[3] ?? '/' }
}

export async function run (exec, { uri, args = [] }) {
  const { pkg, target: t } = target(uri)
  if (t === '/run') throw new Error(`not run here: ${uri} (a package's program)`)
  const listed = await exec.read('/packages/manifest.json').then(b => JSON.parse(b.toString()).packages || {}, () => ({}))
  if (!listed[pkg]) throw new Error(`not a package of this mrepo: ${pkg}`)
  const bundle = join(exec.runtime.dir, 'packages', `${pkg}.bundle`)
  if (!existsSync(bundle)) throw new Error(`its bundle missing: ${bundle}`)
  const dispatcher = await import(pathToFileURL(bundle).href)
  if (typeof dispatcher.run !== 'function') throw new Error(`${pkg} has no dispatcher`)
  const dryRun = args.includes('dry-run')
  // the in-situ tests: which mrepo (MREPO), which package (PACKAGE), and the
  // mrepo's state handed over (SITU: a file, removed after): its help as
  // extracted, its layers, its packages manifest, each linked bundle's hash
  const situ = mkdtempSync(join(tmpdir(), 'situ-'))
  let r
  try {
    const read = p => exec.read(p).then(b => JSON.parse(b.toString()), () => null)
    const linked = {}
    for (const p of Object.keys(listed)) {
      const f = join(exec.runtime.dir, 'packages', `${p}.bundle`)
      linked[p] = existsSync(f) ? { sha256: crypto.createHash('sha256').update(readFileSync(f)).digest('hex') } : null
    }
    writeFileSync(join(situ, 'situ.json'), JSON.stringify({
      help: { index: await read('/help/index.json'), problems: await read('/help/problems.json') },
      layers: (await exec.runtime.branches()).filter(b => !b.startsWith('execute/')),
      packages: listed,
      linked
    }))
    r = await dispatcher.run(t, { dryRun, env: { MREPO: exec.runtime.dir, PACKAGE: pkg, SITU: join(situ, 'situ.json') } })
  } finally { rmSync(situ, { recursive: true, force: true }) }
  if (dryRun) return { target: t, runs: r }
  if (t === '/protocol' || t === '/deploy') return { target: t, offers: Object.keys(r).filter(k => k !== 'default') }
  // a test's result: summarised in the log, whole in the output
  for (const u of r.units || []) exec.log(u.ok ? 'info' : 'error', 'unit', { unit: u.unit, ok: u.ok, tests: u.tests, failures: u.failures })
  return r
}


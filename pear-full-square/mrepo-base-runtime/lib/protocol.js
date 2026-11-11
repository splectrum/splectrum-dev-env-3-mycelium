// The runtime protocol (docs/design/repositories.md, "The runtime protocol"):
// the runtime's own, in every mrepo it runs. run:
// an entry of a package the mrepo has linked, through that package's
// dispatcher (its bundle in the mrepo's packages/, imported: nothing runs
// but what is asked).
//   runtime run /packages/<org>/<package><target>   body: { dryRun }
//     a test (/test/<set>, /test/<name>, /test/modules[/<org>/<module>]):
//     run self-contained (a floating instance of the package, each unit its
//     own process, removed after), its result the output, a summary logged;
//     /protocol, /deploy: what the entry offers (its names); with dryRun:
//     what the target would run. /run: refused (a package's program is not
//     run inside the runtime's process).
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'bare-fs'
import { tmpdir } from 'bare-os'
import { join } from 'bare-path'
import { pathToFileURL } from 'bare-url'

export const PROTOCOL = 'runtime'

function target (uri) {
  const m = uri.match(/^\/packages\/([^/]+)\/([^/]+)(\/.*)?$/)
  if (!m) throw new Error(`not a package's entry: ${uri} (/packages/<org>/<package>/<target>)`)
  return { pkg: `${m[1]}/${m[2]}`, target: m[3] ?? '/' }
}

export async function run (exec, { uri, body }) {
  const { pkg, target: t } = target(uri)
  if (t === '/run') throw new Error(`not run here: ${uri} (a package's program)`)
  const listed = await exec.read('/packages/manifest.json').then(b => JSON.parse(b.toString()).packages || {}, () => ({}))
  if (!listed[pkg]) throw new Error(`not a package of this mrepo: ${pkg}`)
  const bundle = join(exec.runtime.dir, 'packages', `${pkg}.bundle`)
  if (!existsSync(bundle)) throw new Error(`its bundle missing: ${bundle}`)
  const dispatcher = await import(pathToFileURL(bundle).href)
  if (typeof dispatcher.run !== 'function') throw new Error(`${pkg} has no dispatcher`)
  const dryRun = Boolean(body?.dryRun)
  // the in-situ tests: which mrepo, which package, and the mrepo's help as
  // extracted (HELP: a file, { index, problems }, removed after)
  const help = mkdtempSync(join(tmpdir(), 'help-'))
  let r
  try {
    const read = p => exec.read(p).then(b => JSON.parse(b.toString()), () => null)
    writeFileSync(join(help, 'help.json'), JSON.stringify({ index: await read('/help/index.json'), problems: await read('/help/problems.json') }))
    r = await dispatcher.run(t, { dryRun, env: { MREPO: exec.runtime.dir, PACKAGE: pkg, HELP: join(help, 'help.json') } })
  } finally { rmSync(help, { recursive: true, force: true }) }
  if (dryRun) return { target: t, runs: r }
  if (t === '/protocol' || t === '/deploy') return { target: t, offers: Object.keys(r).filter(k => k !== 'default') }
  // a test's result: summarised in the log, whole in the output
  for (const u of r.units || []) exec.log(u.ok ? 'info' : 'error', 'unit', { unit: u.unit, ok: u.ok, tests: u.tests, failures: u.failures })
  return r
}

export const ACTIONS = { [PROTOCOL]: { run } }

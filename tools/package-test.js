// A package's pre-release: its final test run, and the report that proves
// it. For each package: assembled and bundled into the sources; when its
// test report (test-reports/full.json) names the bundle's content and
// passed, it is current and nothing is run. Else its full set is run from
// the bundle, the report written (passed or not; full.json, and full.md, the
// same to read), and the package bundled again with it: a release holds the
// report of its own pre-release.
// Nothing changed, nothing rerun: the same bundle comes out.
//   tools/bare tools/package-test.js <package folder>... [--out=<folder>] [--force]
//     --force   run the set even when the report is current
// One line a package: { package, report, ok, content }, report one of
// current (nothing run), written; a failing unit named on stderr. Exit 1
// when one did not pass.
import process from 'bare-process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'bare-fs'
import { join, resolve, dirname, basename } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { spawnSync } from 'bare-subprocess'
import { REPORT, READABLE, statusOf, reportOf, render } from './lib/report.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const folders = args.filter(a => !a.startsWith('--')).map(a => resolve(a))
if (!folders.length) { console.error('usage: package-test.js <package folder>... [--out=<folder>] [--force]'); process.exit(2) }
const out = resolve(args.find(a => a.startsWith('--out='))?.slice(6) ?? join(dev, 'sources'))
const force = args.includes('--force')
const org = 'haiccing'
const bare = join(dev, 'tools', 'bare')

function build (folder) {
  for (const t of ['package-assemble.js', 'package-bundle.js']) {
    const r = spawnSync(bare, [join(dev, 'tools', t), folder, ...(t === 'package-bundle.js' ? [`--out=${out}`] : [])], { stdio: ['ignore', 'ignore', 'inherit'] })
    if (r.status !== 0) throw new Error(`failed: ${t} ${folder}`)
  }
  return JSON.parse(readFileSync(join(out, org, 'manifest.json'), 'utf8')).packages[`${org}/${basename(folder)}`]
}

let failed = 0
for (const folder of folders) {
  const name = `${org}/${basename(folder)}`
  let entry = build(folder)
  let report = 'current'
  if (force || statusOf(folder, entry.content) !== 'current') {
    // the full set, from the bundle, each unit its own process: its result the last line
    const env = { ...Object.fromEntries(Object.keys(process.env).map(k => [k, process.env[k]])), SOURCES: out }
    const ran = spawnSync(bare, [join(out, entry.file), '/test/full'], { stdio: ['ignore', 'pipe', 'inherit'], env })
    let result = null
    try { result = JSON.parse(ran.stdout.toString().trim().split('\n').at(-1)) } catch { result = { ok: false, units: [] } }
    mkdirSync(join(folder, 'test-reports'), { recursive: true })
    const r = { package: name, content: entry.content, bare: Bare.version, date: new Date().toISOString(), set: 'full', ok: result.ok === true, units: result.units ?? [] }
    writeFileSync(join(folder, REPORT), JSON.stringify(r, null, 2) + '\n')
    writeFileSync(join(folder, READABLE), render(r))
    report = 'written'
    // bundled again, the report in it: its content the same, by what the hash leaves out
    const again = build(folder)
    if (again.content !== entry.content) throw new Error(`${name}: its content changed by adding the report (${entry.content} -> ${again.content})`)
    entry = again
    for (const u of result.units ?? []) if (!u.ok) console.error(`${name}: ${u.unit}: ${(u.failures ?? []).join('; ') || 'failed'}`)
  }
  // the report to read: there, and as the report says (written again when
  // not, nothing run; the bundle built again to hold it)
  else {
    const r = reportOf(folder)
    const text = render(r)
    if (!existsSync(join(folder, READABLE)) || readFileSync(join(folder, READABLE), 'utf8') !== text) { writeFileSync(join(folder, READABLE), text); entry = build(folder) }
  }
  const ok = statusOf(folder, entry.content) === 'current'
  if (!ok) failed++
  console.log(JSON.stringify({ package: name, report, ok, content: entry.content }))
}
process.exit(failed ? 1 : 0)

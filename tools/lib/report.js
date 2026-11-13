// A package's test report: test-reports/full.json in its folder, the proof
// that its full set passed, written by its pre-release
// (tools/package-test.js) and carried in its bundle.
//   { package, content, bare, date, set, ok, units }
//     content   the bundle's content it certifies (the manifest's: a hash
//               of everything in the bundle but its test reports)
//     units     each unit of the set: its tests, its asserts, its failures
// statusOf(folder, content): the report against a bundle's content:
//   current   it names that content and passed
//   failed    it names that content and did not pass
//   stale     it names another content: the package changed since
//   none      no report
// Beside it the same report to read, test-reports/full.md: a sentence, an
// overview table, a table of the units, the failures when there are any;
// written from the JSON (render), never by hand.
// docs: haiccing/package-docs-template (test-reports/README.md).
import { readFileSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'

export const REPORT = join('test-reports', 'full.json')
export const READABLE = join('test-reports', 'full.md')

// The report to read, from the report: Markdown.
export function render (r) {
  const units = r.units ?? []
  const sum = k => units.reduce((a, u) => [a[0] + (u[k]?.passed ?? 0), a[1] + (u[k]?.total ?? 0)], [0, 0])
  const [tp, tt] = sum('tests')
  const [ap, at] = sum('asserts')
  const passed = units.filter(u => u.ok).length
  const of = c => c ? `${c.passed} of ${c.total}` : 'none reported'
  const when = `${r.date.slice(0, 10)} ${r.date.slice(11, 16)} UTC`
  const failures = units.filter(u => !u.ok)
  const L = [
    `# Test report: ${r.package}`,
    '',
    r.ok
      ? `The package passed its \`${r.set}\` set: all ${units.length} units, ${tp} of ${tt} tests and ${ap} of ${at} asserts.`
      : `The package did not pass its \`${r.set}\` set: ${passed} of ${units.length} units passed, ${tp} of ${tt} tests and ${ap} of ${at} asserts.`,
    '',
    '| | |',
    '|---|---|',
    `| Package | \`${r.package}\` |`,
    `| Set | \`${r.set}\` |`,
    `| Result | ${r.ok ? 'passed' : 'failed'} |`,
    `| Units | ${passed} of ${units.length} passed |`,
    `| Tests | ${tp} of ${tt} passed |`,
    `| Asserts | ${ap} of ${at} passed |`,
    `| Run | ${when} |`,
    `| Bare | ${r.bare} |`,
    `| Content | \`${r.content}\` |`,
    '',
    '## Units',
    '',
    '| Unit | Result | Tests | Asserts |',
    '|---|---|---|---|',
    ...units.map(u => `| \`${u.unit}\` | ${u.ok ? 'passed' : 'failed'} | ${of(u.tests)} | ${of(u.asserts)} |`)
  ]
  if (failures.length) {
    L.push('', '## Failures', '')
    for (const u of failures) for (const f of (u.failures?.length ? u.failures : ['failed, no test named'])) L.push(`- \`${u.unit}\`: ${f}`)
  }
  L.push('', 'Written by the package\'s pre-release from `full.json`, beside it. The content is the hash of the bundle that was tested, its test reports left out.', '')
  return L.join('\n')
}

export function reportOf (folder) {
  const f = join(folder, REPORT)
  if (!existsSync(f)) return null
  try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null }
}

export function statusOf (folder, content) {
  const r = reportOf(folder)
  if (!r) return 'none'
  if (r.content !== content) return 'stale'
  return r.ok === true ? 'current' : 'failed'
}

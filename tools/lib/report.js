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
// docs: haiccing/package-docs-template (test-reports/README.md).
import { readFileSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'

export const REPORT = join('test-reports', 'full.json')

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

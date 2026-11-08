// A node's self-test: the packages copied into its packages/, each first
// checked intact (its hash against the one it was written with: nothing
// changed, nothing missing), then tested in place by the package manager: its validation set (test/validation.json:
// the package as it is, nothing started), or, a package without one,
// everything that runs in place, bottom up. Nothing installed, nothing changed. Each run
// said as it ends: ok or FAILED, its counts, how long; a failure with the
// end of its output.
//   const { ok, repos, runs } = selfTest(packagesFolder, say)
import { existsSync, readFileSync, readdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { pkgm } from './pkgm.js'

const { testPackage, verify } = await pkgm()

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

export function selfTest (packages, say = console.log) {
  const runs = []
  const repos = existsSync(packages) ? readdirSync(packages).filter(n => existsSync(join(packages, n, 'package.json')) && readJson(join(packages, n, 'package.json')).pkgm).sort() : []
  for (const repo of repos) {
    say(`${repo}:`)
    const dir = join(packages, repo)
    // Intact first: a changed copy is not run.
    const v = verify(dir)
    say(`  ${v.ok ? 'ok    ' : 'FAILED'} ${repo}: ${v.said}`)
    runs.push({ what: `${repo}: intact`, ok: v.ok, tests: 1, pass: v.ok ? 1 : 0, fail: v.ok ? 0 : 1, skipped: 0, ms: 0 })
    if (!v.ok) continue
    const t = testPackage(dir, {
      set: existsSync(join(dir, 'test', 'validation.json')) ? 'validation' : null,
      log: e => {
        if (e.kind !== 'tested') return
        say(`  ${e.ok ? 'ok    ' : 'FAILED'} ${repo}/${e.what} (${e.pass}/${e.tests}${e.skipped ? `, ${e.skipped} skipped` : ''}, ${(e.ms / 1000).toFixed(1)} s)`)
      }
    })
    for (const r of t.runs) {
      if (!r.ok && r.output) say(r.output.split('\n').slice(-30).map(l => `         ${l}`).join('\n'))
      runs.push({ ...r, what: `${repo}/${r.what}` })
    }
  }
  return { ok: repos.length > 0 && runs.every(r => r.ok), repos, runs }
}

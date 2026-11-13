// A package's help, extracted from its own files as a runtime would extract
// it, checked against the rules (internal/extract): no problems. Run inside the
// package (its dispatcher's /test/help): this file at
// modules/pear-full-square/mrepo-base-help/validate/, the package four
// folders up.
import test from 'brittle'
import { readFileSync, readdirSync, statSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { extract } from '../internal/extract/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

function files (dir, at = '') {
  return readdirSync(join(dir, at)).sort().flatMap(n => {
    const p = `${at}/${n}`
    if (p === '/modules/node_modules') return []
    return statSync(join(dir, p)).isDirectory() ? files(dir, p) : [p]
  })
}

test('its help: every README extracted, none against the rules', (t) => {
  const pj = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const pkg = `package/${pj.name}`
  const paths = files(root)
  const readmes = Object.fromEntries(paths.filter(p => p.endsWith('/README.md')).map(p => [p, readFileSync(join(root, p))]))
  const out = extract([{ pkg, files: readmes, help: pj.help ?? null, paths }])
  const index = JSON.parse(out['/index.json'].toString())
  t.ok(index[`/packages/${pkg}`], `its README at its root (${Object.keys(index).length} READMEs)`)
  const problems = JSON.parse(out['/problems.json'].toString())
  for (const p of problems) t.comment(`${p.uri}: ${p.check}: ${p.detail}`)
  t.is(problems.length, 0, 'no problems')
})

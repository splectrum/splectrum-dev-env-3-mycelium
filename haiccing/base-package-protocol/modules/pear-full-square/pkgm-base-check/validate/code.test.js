// A package's code checked against the code rules (internal/rules): each
// module of ours it carries, and its own code. Run inside the package (its
// dispatcher's /test/code): this file at
// modules/pear-full-square/pkgm-base-check/validate/, the package four
// folders up.
import test from 'brittle'
import { readFileSync, readdirSync, statSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { checkModule, checkPackage } from '../internal/rules/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('its code: the modules it carries and its own, none against the rules', (t) => {
  const mods = join(root, 'modules')
  const ours = []
  const dirs = []
  for (const org of existsSync(mods) ? readdirSync(mods).filter(n => n !== 'node_modules' && statSync(join(mods, n)).isDirectory()) : []) {
    for (const m of readdirSync(join(mods, org))) {
      const pj = join(mods, org, m, 'package.json')
      if (!existsSync(pj)) continue
      ours.push(JSON.parse(readFileSync(pj, 'utf8')).name)
      dirs.push([`${org}/${m}`, join(mods, org, m)])
    }
  }
  const problems = [...checkPackage(root).map(p => ({ ...p, where: 'package' })), ...dirs.flatMap(([n, d]) => checkModule(d, { ours }).map(p => ({ ...p, where: n })))]
  for (const p of problems) t.comment(`${p.where}: ${p.file}: ${p.check}: ${p.detail}`)
  t.ok(dirs.length >= 0, `${dirs.length} modules of ours`)
  t.is(problems.length, 0, 'no problems')
})

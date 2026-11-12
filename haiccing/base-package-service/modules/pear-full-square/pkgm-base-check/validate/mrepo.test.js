// A package's mrepo side checked (internal/mrepo): its structure, its
// protocols, what it carries. Run inside the package (its dispatcher's
// /test/mrepo): this file at modules/pear-full-square/pkgm-base-check/validate/,
// the package four folders up.
import test from 'brittle'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { checkStructure, checkProtocol, checkCarried } from '../internal/mrepo/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('its mrepo side: its structure, its protocols, what it carries, none against the rules', async (t) => {
  const problems = [...checkStructure(root), ...await checkProtocol(root), ...checkCarried(root)]
  for (const p of problems) t.comment(`${p.check}: ${p.detail}`)
  t.is(problems.length, 0, 'no problems')
})

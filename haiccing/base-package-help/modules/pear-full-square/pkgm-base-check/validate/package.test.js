// A package checked against the structure it is to have (internal/package):
// its files, its sets, its tests, and that it tests what it provides. Run
// inside the package (its dispatcher's /test/package): this file at
// modules/pear-full-square/pkgm-base-check/validate/, the package four
// folders up.
import test from 'brittle'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { checkOwn } from '../internal/package/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('its structure: its files, its sets, its tests, a test of its own for what it provides', async (t) => {
  const problems = await checkOwn(root)
  for (const p of problems) t.comment(`${p.check}: ${p.detail}`)
  t.is(problems.length, 0, 'no problems')
})

// A package's help as a running mrepo's runtime extracted it, checked: the
// package's READMEs in the mrepo's help layer, none against the rules. Run
// by runtime run (/packages/<org>/<package>/test/help-in-situ), which names
// the mrepo (MREPO), the package (PACKAGE) and hands over the mrepo's state
// (SITU: a file; its help as extracted, { index, problems }); skipped
// without them.
import test from 'brittle'
import { readFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import os from 'bare-os'

const MREPO = os.hasEnv('MREPO') ? os.getEnv('MREPO') : null
const PACKAGE = os.hasEnv('PACKAGE') ? os.getEnv('PACKAGE') : null
const SITU = os.hasEnv('SITU') ? os.getEnv('SITU') : null
// the package this runs in (four folders up): a help folder of its own
// documents the mrepo itself, its READMEs at the help root
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const helpFolder = (() => { try { return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).help ?? null } catch { return null } })()

test('its help in the mrepo: extracted, none against the rules', { skip: !MREPO || !PACKAGE || !SITU }, async (t) => {
  const { index, problems: all } = JSON.parse(readFileSync(SITU, 'utf8')).help
  const mine = Object.keys(index).filter(u => u === `/packages/${PACKAGE}` || u.startsWith(`/packages/${PACKAGE}/`) || (helpFolder && !u.startsWith('/packages/')))
  t.ok(mine.length, `its READMEs in ${MREPO}'s help: ${mine.length}`)
  t.ok(index['/packages']?.links.includes(`/packages/${PACKAGE}`), 'linked from the packages layer\'s help')
  const problems = (all ?? []).filter(p => mine.includes(p.uri))
  for (const p of problems) t.comment(`${p.uri}: ${p.check}: ${p.detail}`)
  t.is(problems.length, 0, 'no problems')
})

// A package's help as a running mrepo's runtime extracted it, checked: the
// package's READMEs in the mrepo's help layer, none against the rules. Run
// by runtime run (/packages/<org>/<package>/test/help-in-situ), which names
// the mrepo (MREPO, its directory) and the package (PACKAGE); skipped
// without them.
import test from 'brittle'
import fs from 'bare-fs'
import { join } from 'bare-path'
import os from 'bare-os'
import { openRepo, p2pgitBackend } from 'mycelium-git'

const MREPO = os.hasEnv('MREPO') ? os.getEnv('MREPO') : null
const PACKAGE = os.hasEnv('PACKAGE') ? os.getEnv('PACKAGE') : null

test('its help in the mrepo: extracted, none against the rules', { skip: !MREPO || !PACKAGE }, async (t) => {
  const repo = openRepo(p2pgitBackend(join(MREPO, '.git'), { fs }))
  const read = async p => JSON.parse((await repo.read(p)).toString())
  const index = await read('/help/index.json')
  const mine = Object.keys(index).filter(u => u === `/packages/${PACKAGE}` || u.startsWith(`/packages/${PACKAGE}/`))
  t.ok(mine.length, `its READMEs in ${MREPO}'s help: ${mine.length}`)
  t.ok(index['/packages']?.links.includes(`/packages/${PACKAGE}`), 'linked from the packages layer\'s help')
  const problems = (await read('/help/problems.json')).filter(p => mine.includes(p.uri))
  for (const p of problems) t.comment(`${p.uri}: ${p.check}: ${p.detail}`)
  t.is(problems.length, 0, 'no problems')
})

// A package as a running mrepo holds it, checked: linked there, its bundle
// the one the mrepo's packages manifest names, the layers it brings there.
// Run by runtime run (/packages/<org>/<package>/test/mrepo-in-situ), which
// names the mrepo (MREPO), the package (PACKAGE) and hands over the mrepo's
// state (SITU: a file, { layers, packages, linked }); skipped without them.
import test from 'brittle'
import { readFileSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import os from 'bare-os'
import { leaves } from '../internal/mrepo/index.js'

const env = n => os.hasEnv(n) ? os.getEnv(n) : null
const [MREPO, PACKAGE, SITU] = ['MREPO', 'PACKAGE', 'SITU'].map(env)
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('in the mrepo: linked, its bundle as the manifest names it, its layers there', { skip: !MREPO || !PACKAGE || !SITU }, (t) => {
  const { layers, packages, linked } = JSON.parse(readFileSync(SITU, 'utf8'))
  t.ok(packages?.[PACKAGE], `in ${MREPO}'s packages manifest`)
  t.ok(linked?.[PACKAGE]?.sha256 && linked[PACKAGE].sha256 === packages?.[PACKAGE]?.sha256, 'its bundle in the mrepo\'s packages/: the one the manifest names (sha256)')
  // the layers it brings (not a documentation package: it brings none)
  const pj = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const mine = pj.docs || !existsSync(join(root, 'mrepo')) ? [] : leaves(join(root, 'mrepo'))
  const missing = mine.filter(l => !layers.includes(l))
  t.alike(missing, [], `its layers in the mrepo (${mine.length})`)
})

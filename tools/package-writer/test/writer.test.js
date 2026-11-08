import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readlinkSync, statSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { writePackages } from '../index.js'
import { verify } from '../../../pear-full-square/pkgm-base-manager/index.js'
import { closure } from '../../../pear-full-square/pkgm-base-manager/lib/closure.js'
import { copy } from '../../../pear-full-square/pkgm-base-manager/lib/tree.js'
import { fileURLToPath } from 'bare-url'

const real = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'node_modules')

const put = (f, s) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s) }
const json = (f, v) => put(f, JSON.stringify(v, null, 2))

// A development repository in miniature: two modules of ours (one using the
// other), one third-party module with a test folder and a prebuild for
// another platform, and a swarm package whose swarm names one module.
function devRepo () {
  const dev = mkdtempSync(join(tmpdir(), 'writer-dev-'))
  json(join(dev, 'org/amod/package.json'), { name: 'amod', type: 'module', exports: './index.js', scripts: { test: 'sh test/a.sh' } })
  put(join(dev, 'org/amod/index.js'), "import { b } from 'bmod'\nexport const a = () => b() + 1\n")
  put(join(dev, 'org/amod/test/a.sh'), 'cd "$(dirname "$0")/.." && [ -f index.js ] && echo "# tests 1" && echo "# pass 1"\n')
  // brittle and what it uses, as this repository has them: the package's
  // own tests (test/modules-load) run on it.
  for (const n of closure({ ours: new Map(), third: real, start: [], also: ['brittle'] }).third) copy(join(real, n), join(dev, 'node_modules', n))
  json(join(dev, 'org/bmod/package.json'), { name: 'bmod', type: 'module', exports: './index.js' })
  put(join(dev, 'org/bmod/log/20261107T000000Z.log'), 'a run left this\n')
  put(join(dev, 'org/bmod/index.js'), "import { x } from 'dep-x'\nexport const b = () => x\n")
  json(join(dev, 'node_modules/dep-x/package.json'), { name: 'dep-x', version: '1.2.3', license: 'MIT', type: 'module', exports: './index.js' })
  put(join(dev, 'node_modules/dep-x/index.js'), 'export const x = 42\n')
  put(join(dev, 'node_modules/dep-x/test/t.js'), 'not shipped\n')
  put(join(dev, 'node_modules/dep-x/prebuilds/other-arch/x.node'), 'not shipped\n')
  json(join(dev, 'package-lock.json'), { packages: { 'node_modules/dep-x': { version: '1.2.3', integrity: 'sha512-x' } } })
  json(join(dev, 'packages.json'), { packages: {
    code: { description: 'Code.', modules: ['org/amod', 'org/bmod'] },
    swarmy: { repo: 'base-swarm-y', description: 'A swarm.' }
  } })
  json(join(dev, 'haiccing/base-swarm-y/swarms/s1/modules.json'), { modules: ['org/amod'] })
  json(join(dev, 'haiccing/base-swarm-y/swarms/s1/nodes.json'), { nodes: { master: { role: 'master' } } })
  put(join(dev, 'haiccing/base-swarm-y/README.md'), '# base-swarm-y\n\nBy hand.\n')
  return dev
}

test('written: self-contained, in the package structure, tested first', (t) => {
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'writer-out-'))
  try {
    // A published repository's own LICENSE, there before writing (as a clone has it).
    mkdirSync(join(out, 'base-swarm-y'), { recursive: true })
    writeFileSync(join(out, 'base-swarm-y', 'LICENSE'), 'its own licence\n')
    const r = writePackages({ dev, out })
    t.is(r.ok, true, JSON.stringify(r.results))
    // The LICENSE is part of the package: kept, hashed with it; the copy as written is intact.
    t.is(readFileSync(join(out, 'base-swarm-y', 'LICENSE'), 'utf8'), 'its own licence\n')
    t.ok(verify(join(out, 'base-swarm-y')).ok, 'intact as written, its LICENSE included')
    const y = join(out, 'base-swarm-y')
    // Its swarm's codebase and what that uses, all the way down.
    t.ok(existsSync(join(y, 'modules/org/amod/index.js')))
    t.ok(existsSync(join(y, 'modules/org/bmod/index.js')))
    t.ok(existsSync(join(y, 'modules/node_modules/dep-x/index.js')))
    t.ok(!existsSync(join(y, 'modules/node_modules/dep-x/test')), 'third-party tests not shipped')
    t.ok(!existsSync(join(y, 'modules/node_modules/dep-x/prebuilds/other-arch')), 'other platforms not shipped')
    t.is(readlinkSync(join(y, 'modules/node_modules/bmod')), '../org/bmod')
    t.ok(!existsSync(join(y, 'modules/org/bmod/log')), 'a log a run left: not carried')
    t.alike(JSON.parse(readFileSync(join(y, 'modules/third-party.json'), 'utf8')).modules.find(m => m.name === 'dep-x'), { name: 'dep-x', version: '1.2.3', license: 'MIT', resolved: null, integrity: 'sha512-x' })
    // The hand-written parts as they are; the named test written here.
    t.is(readFileSync(join(y, 'README.md'), 'utf8'), '# base-swarm-y\n\nBy hand.\n')
    t.ok(existsSync(join(y, 'swarms/s1/nodes.json')))
    t.ok(statSync(join(y, 'test/modules-load/test')).mode & 0o100)
    const m = JSON.parse(readFileSync(join(y, 'package.json'), 'utf8'))
    t.is(m.name, 'base-swarm-y')
    t.alike(m.pkgm.modules.ours, ['org/amod', 'org/bmod'])
    t.ok(m.pkgm.modules.third > 2, 'dep-x, and brittle with what it uses')
    t.ok(existsSync(join(y, 'modules/node_modules/brittle/index.js')), 'brittle carried: its own tests run on it')
    t.alike(m.pkgm.swarms, ['s1'])
    t.is(m.pkgm.requires, undefined, 'no requires')
    t.ok(/^[0-9a-f]{64}$/.test(m.pkgm.hash))
    // A generated readme for one without its own.
    t.ok(/Self-contained/.test(readFileSync(join(out, 'base-package-code', 'README.md'), 'utf8')))
    // Written again: the same hash.
    writePackages({ dev, out })
    t.is(JSON.parse(readFileSync(join(y, 'package.json'), 'utf8')).pkgm.hash, m.pkgm.hash)
  } finally { for (const d of [dev, out]) rmSync(d, { recursive: true, force: true }) }
})

test('a test failing: nothing written', (t) => {
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'writer-out-'))
  try {
    put(join(dev, 'org/amod/test/a.sh'), 'echo "# tests 1"; echo "# pass 0"; exit 1\n')
    const r = writePackages({ dev, out })
    t.is(r.ok, false)
    t.alike(r.written, [])
    t.ok(!existsSync(join(out, 'base-swarm-y')))
  } finally { for (const d of [dev, out]) rmSync(d, { recursive: true, force: true }) }
})

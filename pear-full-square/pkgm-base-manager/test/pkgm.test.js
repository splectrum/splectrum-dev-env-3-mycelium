import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, readlinkSync, symlinkSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { assemble, testPackage, contentsOf, closure, oursIn, packageHash, verify, deploy } from '../index.js'

const put = (f, s, x = false) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); if (x) chmodSync(f, 0o755) }
const json = (f, v) => put(f, JSON.stringify(v, null, 2))

// A package in miniature, as the package writer makes them: two modules of
// ours (one using the other by name, one by a relative path), a third one
// no swarm uses, third-party code with a dependency of its own, links to
// ours by name, a swarm, a named test.
function pkg () {
  const dir = mkdtempSync(join(tmpdir(), 'pkgm-pkg-'))
  const m = join(dir, 'modules')
  json(join(m, 'org/amod/package.json'), { name: 'amod', type: 'module', exports: './index.js', scripts: { test: 'sh test/a.sh' } })
  put(join(m, 'org/amod/index.js'), "import { b } from 'bmod'\nimport { x } from 'dep-x'\nexport const a = () => b() + x\n")
  // Its test: a plain script (any executable), run in its folder.
  put(join(m, 'org/amod/test/a.sh'), 'cd "$(dirname "$0")/.." && [ -f index.js ] && echo "# tests 1" && echo "# pass 1"\n')
  json(join(m, 'org/bmod/package.json'), { name: 'bmod', type: 'module', exports: './index.js' })
  put(join(m, 'org/bmod/index.js'), "import { c } from '../cmod/index.js'\nexport const b = () => c\n")
  json(join(m, 'org/cmod/package.json'), { name: 'cmod', type: 'module', exports: './index.js' })
  put(join(m, 'org/cmod/index.js'), 'export const c = 1\n')
  json(join(m, 'org/unused/package.json'), { name: 'unused', type: 'module', exports: './index.js' })
  put(join(m, 'org/unused/index.js'), "import 'dep-z'\nexport const u = 0\n")
  json(join(m, 'node_modules/dep-x/package.json'), { name: 'dep-x', version: '1.0.0', type: 'module', exports: './index.js', dependencies: { 'dep-y': '1' } })
  put(join(m, 'node_modules/dep-x/index.js'), "import { y } from 'dep-y'\nexport const x = y\n")
  json(join(m, 'node_modules/dep-y/package.json'), { name: 'dep-y', version: '2.0.0', type: 'module', exports: './index.js' })
  put(join(m, 'node_modules/dep-y/index.js'), 'export const y = 41\n')
  json(join(m, 'node_modules/dep-z/package.json'), { name: 'dep-z', version: '3.0.0' })
  for (const n of ['amod', 'bmod', 'cmod', 'unused']) symlinkSync(`../org/${n}`, join(m, 'node_modules', n))
  json(join(m, 'third-party.json'), { modules: ['dep-x', 'dep-y', 'dep-z'].map(name => ({ name, version: '1' })) })
  json(join(dir, 'swarms/s1/modules.json'), { modules: ['org/amod'] })
  put(join(dir, 'swarms/s1/test/config'), '#!/bin/sh\necho "# tests 1"\necho "# pass 1"\n', true)
  put(join(dir, 'test/t1/test'), '#!/bin/sh\necho "# tests 2"\necho "# pass 2"\n', true)
  json(join(dir, 'package.json'), { name: 'base-x', pkgm: { package: 'x', hash: 'abc123' } })
  return dir
}

test('closure: ours by name and by relative path, third-party all the way down; nothing else', (t) => {
  const dir = pkg()
  try {
    const r = closure({ ours: oursIn(join(dir, 'modules')), third: join(dir, 'modules', 'node_modules'), start: ['org/amod'] })
    t.alike(r.ours, ['org/amod', 'org/bmod', 'org/cmod'])
    t.alike(r.third, ['dep-x', 'dep-y'])
    t.alike(r.missing, [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test("assemble: a swarm's codebase into a repository, its contents said; again: unchanged; a name the package lacks: refused", (t) => {
  const dir = pkg()
  const repo = join(dir, '..', `${dir.split('/').at(-1)}-repo`)
  try {
    const r = assemble({ from: dir, swarm: 's1', into: repo })
    t.is(r.changed, true)
    t.alike([r.ours, r.third], [3, 2])
    t.ok(existsSync(join(repo, 'modules/org/cmod/index.js')))
    t.ok(!existsSync(join(repo, 'modules/org/unused')), 'only what the swarm uses')
    t.ok(!existsSync(join(repo, 'modules/node_modules/dep-z')))
    t.is(readlinkSync(join(repo, 'modules/node_modules/amod')), '../org/amod')
    const c = contentsOf(repo)
    t.alike([c.package.name, c.package.hash, c.swarm], ['base-x', 'abc123', 's1'])
    t.alike(c.modules.third, ['dep-x', 'dep-y'])
    t.alike(JSON.parse(readFileSync(join(repo, 'modules/third-party.json'), 'utf8')).modules.map(m => m.name), ['dep-x', 'dep-y'])
    t.ok(!existsSync(`${repo}.assembling`))
    t.is(assemble({ from: dir, swarm: 's1', into: repo }).changed, false)
    // The repository runs: its module tests, in place.
    const tr = testPackage(repo)
    t.is(tr.ok, true, JSON.stringify(tr.runs))
    json(join(dir, 'swarms/s2/modules.json'), { modules: ['org/nope'] })
    t.exception(() => assemble({ from: dir, swarm: 's2', into: repo }), /does not hold: org\/nope/)
    t.exception(() => assemble({ from: dir, swarm: 's9', into: repo }), /no swarm s9/)
    t.is(contentsOf(repo).swarm, 's1', 'a refused assembly changes nothing')
  } finally { for (const d of [dir, repo]) rmSync(d, { recursive: true, force: true }) }
})

test('test: bottom up, the modules, the swarms, the named tests; a failure said with its output', (t) => {
  const dir = pkg()
  try {
    const tr = testPackage(dir)
    t.is(tr.ok, true, JSON.stringify(tr.runs))
    t.alike(tr.runs.map(r => r.what), ['modules/org/amod', 'swarms/s1/test/config', 'test/t1'])
    t.alike(tr.runs.map(r => r.pass), [1, 1, 2])
    put(join(dir, 'test/t1/test'), '#!/bin/sh\necho broken\nexit 1\n', true)
    const f = testPackage(dir)
    t.is(f.ok, false)
    t.ok(/broken/.test(f.runs.at(-1).output))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('test: a run that does not end is stopped, and fails; the rest still run', (t) => {
  const dir = pkg()
  try {
    put(join(dir, 'swarms/s1/test/config'), '#!/bin/sh\nsleep 30\n', true)
    const tr = testPackage(dir, { timeout: 500 })
    t.is(tr.ok, false)
    const hung = tr.runs.find(r => r.what === 'swarms/s1/test/config')
    t.is(hung.ok, false)
    t.ok(/stopped: no end after 0.5 s/.test(hung.output))
    t.is(tr.runs.find(r => r.what === 'test/t1').ok, true)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('test: a set, its in-place tests and (or not) the modules; a booted test listed, not run', (t) => {
  const dir = pkg()
  try {
    put(join(dir, 'test/b1/boot'), '#!/bin/sh\nexit 1\n', true)
    json(join(dir, 'test/validation.json'), { description: 'v', modules: false, tests: ['t1'] })
    json(join(dir, 'test/full.json'), { description: 'f', modules: true, tests: ['t1', 'b1'] })
    const v = testPackage(dir, { set: 'validation' })
    t.alike([v.ok, v.runs.map(r => r.what), v.booted], [true, ['test/t1'], []])
    const f = testPackage(dir, { set: 'full' })
    t.alike([f.ok, f.runs.map(r => r.what), f.booted], [true, ['modules/org/amod', 'test/t1'], ['b1']])
    t.exception(() => testPackage(dir, { set: 'nope' }), /no test set nope/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('verify: a package intact against the hash it was written with; changed, or one file replaced: said, not intact', (t) => {
  const dir = pkg()
  try {
    t.absent(verify(dir).ok, 'a made-up hash: not intact')
    json(join(dir, 'package.json'), { name: 'base-x', pkgm: { package: 'x', hash: packageHash(dir) } })
    const v = verify(dir)
    t.ok(v.ok, v.said)
    t.ok(/^intact \([0-9a-f]{12}\)$/.test(v.said))
    // The manifest is not part of what is hashed: rewriting it changes nothing.
    t.is(packageHash(dir), v.hash)
    // A LICENSE is part of the package: one added after the hash was taken is a change.
    put(join(dir, 'LICENSE'), 'a licence\n')
    t.absent(verify(dir).ok, 'a LICENSE added: not intact')
    rmSync(join(dir, 'LICENSE'))
    t.ok(verify(dir).ok, 'as written again')
    // A file replaced (a new file, as a hard-linked copy is changed without touching its original).
    rmSync(join(dir, 'modules/org/cmod/index.js'))
    put(join(dir, 'modules/org/cmod/index.js'), 'export const c = 2\n')
    const w = verify(dir)
    t.absent(w.ok)
    t.ok(/^changed since it was written: its hash [0-9a-f]{12}, written [0-9a-f]{12}$/.test(w.said), w.said)
    // A file gone.
    rmSync(join(dir, 'modules/org/cmod/index.js'))
    t.absent(verify(dir).ok)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('deploy: staged beside, intact, validated, then in place; a changed or failing package changes nothing', (t) => {
  const dir = pkg()
  const into = join(dir, '..', `${dir.split('/').at(-1)}-into`, 'base-x')
  try {
    json(join(dir, 'test/validation.json'), { description: 'v', modules: false, tests: ['t1'] })
    json(join(dir, 'package.json'), { name: 'base-x', pkgm: { package: 'x', hash: packageHash(dir) } })
    const d = deploy({ from: dir, into })
    t.ok(d.ok, d.said)
    t.ok(/^deployed: intact \([0-9a-f]{12}\), its validation passed$/.test(d.said), d.said)
    t.ok(verify(into).ok, 'in place, intact')
    t.absent(existsSync(`${into}.deploying`))
    // A failing validation: said; what was in place stays.
    put(join(dir, 'test/t1/test'), '#!/bin/sh\nexit 1\n', true)
    json(join(dir, 'package.json'), { name: 'base-x', pkgm: { package: 'x', hash: packageHash(dir) } })
    const f = deploy({ from: dir, into })
    t.absent(f.ok)
    t.is(f.said, 'its validation failed')
    t.ok(verify(into).ok, 'the one in place untouched')
    // Not intact: said, nothing copied over.
    put(join(dir, 'modules/org/cmod/index.js'), 'export const c = 3\n')
    t.ok(/changed since it was written/.test(deploy({ from: dir, into }).said))
  } finally { for (const d of [dir, join(into, '..')]) rmSync(d, { recursive: true, force: true }) }
})

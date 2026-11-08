import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, rmSync, chmodSync, existsSync, statSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { spawnSync } from 'bare-subprocess'
import { fileURLToPath } from 'bare-url'
import process from 'bare-process'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
// A command run to its end: its exit code, and its output as text.
const run = (cmd, args, opts = {}) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }); return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') } }
const which = u => run('sh', ['-c', `command -v ${u}`]).stdout.trim()
const row = (out, name) => out.split('\n').find(l => l.startsWith(name + ' '))?.split(/\s{2,}/)
// A host's tools, for the scripts that run on them: only those named.
function host (tools) {
  const dir = mkdtempSync(join(tmpdir(), 'host-'))
  mkdirSync(join(dir, 'bin'))
  for (const u of tools) symlinkSync(which(u), join(dir, 'bin', u))
  return dir
}
// A runtime as the package carries it: a script standing in, saying its version, or failing.
function runtime (dir, ok = true) {
  const f = join(dir, 'bare')
  writeFileSync(f, ok ? '#!/bin/sh\necho v1.36.0\n' : '#!/bin/sh\nexit 127\n')
  chmodSync(f, 0o644)
  return f
}

test('step 0: Linux x86-64, and the runtime runs here (exit 0); each said with found, required, ok', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'step0-'))
  try {
    const r = run('sh', [join(here, 'step0.sh'), 'check', runtime(dir)])
    t.is(r.status, 0, r.stdout)
    t.alike(row(r.stdout, 'os').slice(1, 4), [`${process.platform === 'linux' ? 'linux' : process.platform}-x86_64`, 'linux-x86_64', 'yes'])
    t.alike(row(r.stdout, 'bare').slice(1, 4), ['v1.36.0', 'runs', 'yes'])
    t.ok(statSync(join(dir, 'bare')).mode & 0o100, 'made executable (npm does not keep the bit)')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('step 0: no runtime, or one that does not run here: no (exit 1), what to do said', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'step0-'))
  try {
    const none = run('sh', [join(here, 'step0.sh'), 'check', join(dir, 'nothing')])
    t.is(none.status, 1)
    t.ok(/^bare +not there +runs +no +set up from a setup \(it carries the runtime\)/m.test(none.stdout), none.stdout)
    const broken = run('sh', [join(here, 'step0.sh'), 'check', runtime(dir, false)])
    t.is(broken.status, 1)
    t.ok(/does not run +runs +no +Bare's runtime does not run on this host/.test(broken.stdout), broken.stdout)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('download: a lost connection is tried again and said; not found is not tried again', (t) => {
  const h = { dir: host(['sh', 'awk', 'sed', 'sort', 'grep', 'tr', 'head', 'cut', 'cat', 'mktemp', 'rm', 'dirname', 'printf', 'sleep', 'wc', 'tail', 'mkdir', 'mv']) }
  try {
    const tools = join(h.dir, 'bin')
    // The fake curl: fails once with a lost connection, then delivers; or says 404.
    writeFileSync(join(tools, 'curl'), `#!/bin/sh\nfor a in "$@"; do last=$a; url=$prev; prev=$a; case $a in *missing*) echo "curl: (22) 404" >&2; exit 22 ;; esac; done\nif [ ! -f "$last.once" ]; then : > "$last.once"; echo "curl: (28) too slow" >&2; exit 28; fi\necho done > "$last"\n`)
    chmodSync(join(tools, 'curl'), 0o755)
    const dl = url => run(join(tools, 'sh'), ['-c', `. ${join(here, 'lib', 'download.sh')}; download ${url} ${join(h.dir, 'out')}`], { env: { PATH: tools, DL_WAIT: '0' } })
    const ok = dl('https://x/there')
    t.is(ok.status, 0, ok.stdout + ok.stderr)
    t.ok(/connection lost \(curl: \(28\) too slow\): trying again in 0 s, 2 of 6/.test(ok.stdout))
    const no = dl('https://x/missing')
    t.is(no.status, 1)
    t.ok(/not available: curl: \(22\) 404/.test(no.stdout))
    t.absent(/trying again/.test(no.stdout))
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

// A folder of repositories, as a source.
function source () {
  const dir = mkdtempSync(join(tmpdir(), 'source-'))
  const repo = (r, pkgm) => { mkdirSync(join(dir, r), { recursive: true }); writeFileSync(join(dir, r, 'package.json'), JSON.stringify({ name: r, pkgm })) }
  repo('base-demo-x', { package: 'demo-x', requires: ['b'] })
  repo('base-package-b', { package: 'b', requires: ['c'] })
  repo('base-package-c', { package: 'c', requires: [] })
  mkdirSync(join(dir, 'base-package-c', '.git'))
  return dir
}

test('fetch: from a folder source, the first that has it; plain copies; each said; --requires fetches no more (self-contained)', (t) => {
  const src = source()
  const work = mkdtempSync(join(tmpdir(), 'work-'))
  try {
    mkdirSync(join(work, 'haiccing'))
    writeFileSync(join(work, 'haiccing', 'sources'), `# test\nfolder ${join(work, 'nowhere')}\nfolder ${src}\n`)
    const r = run('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), '--requires', 'base-demo-x', 'base-package-c'])
    t.is(r.status, 0, r.stdout + r.stderr)
    for (const repo of ['base-demo-x', 'base-package-c']) t.ok(existsSync(join(work, 'haiccing', repo, 'package.json')), repo)
    t.ok(!existsSync(join(work, 'haiccing', 'base-package-b')), 'nothing it does not name')
    t.ok(!existsSync(join(work, 'haiccing', 'base-package-c', '.git')), 'plain copies, no .git')
    t.alike(r.stdout.trimEnd().split('\n').filter(l => l.startsWith('  fetched')), ['base-demo-x', 'base-package-c'].map(x => `  fetched ${x} (folder ${src})`))
    // Already there: kept, not fetched again.
    const again = run('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), 'base-demo-x'])
    t.is(again.status, 0)
    t.is(again.stdout, '')
    // In none of the sources: said, recorded, exit 1.
    const m = run('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), 'base-package-nope'])
    t.is(m.status, 1)
    t.ok(/base-package-nope: in none of the sources/.test(m.stdout))
  } finally { for (const d of [src, work]) rmSync(d, { recursive: true, force: true }) }
})

test('the setup: a self-extracting release, extracting haiccing/ (boot, sources, the package)', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'release-'))
  try {
    // base-package-haicc in miniature: its manifest and this boot; a runtime
    // (a script standing in) for the setup to carry.
    const pkg = join(dir, 'base-package-haicc')
    mkdirSync(join(pkg, 'modules', 'pear-full-square'), { recursive: true })
    run('cp', ['-a', here, join(pkg, 'modules', 'pear-full-square', 'haicc-base-boot')])
    mkdirSync(join(dir, 'rt'))
    const rt = runtime(join(dir, 'rt'))
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'base-package-haicc', pkgm: { package: 'haicc', hash: 'abcdef1234567890' } }))
    // The package manager's package beside it: the platform is a pair.
    mkdirSync(join(dir, 'base-package-pkgm', 'modules'), { recursive: true })
    writeFileSync(join(dir, 'base-package-pkgm', 'package.json'), JSON.stringify({ name: 'base-package-pkgm', pkgm: { package: 'pkgm', hash: '1234567890abcdef' } }))
    const rel = run('sh', [join(here, 'release.sh'), pkg, join(dir, 'haicc-setup.sh'), rt])
    t.is(rel.status, 0, rel.stdout + rel.stderr)
    t.ok(/Bare v1\.36\.0/.test(rel.stdout), 'the runtime it carries, said')
    const work = join(dir, 'work')
    const r = run('sh', [join(dir, 'haicc-setup.sh'), work, `--sources=folder:${dir}/repos`, '--sources=github:haiccing'])
    t.is(r.status, 0, r.stdout + r.stderr)
    t.ok(/next: .*\/work\/boot/.test(r.stdout))
    // Bare's runtime: carried by the setup, placed in bare/, not in the package.
    t.ok(/v1\.36\.0/.test(run(join(work, 'bare', 'bare'), ['--version']).stdout), "Bare's runtime in bare/")
    t.ok(!existsSync(join(work, 'haiccing', 'base-package-haicc', 'modules', 'node_modules')), 'not in the package')
    t.ok(existsSync(join(work, 'haiccing', 'base-package-haicc', 'modules', 'pear-full-square', 'haicc-base-boot', 'boot.sh')))
    // The stubs, ./boot and ./shutdown: executable, naming their setup.
    for (const s of ['boot', 'shutdown']) {
      t.ok(statSync(join(work, s)).mode & 0o100)
      t.ok(new RegExp(`base-package-haicc/modules/pear-full-square/haicc-base-boot/${s}\\.sh`).test(readFileSync(join(work, s), 'utf8')))
    }
    t.alike(readFileSync(join(work, 'haiccing', 'sources'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')), [`folder ${dir}/repos`, 'github haiccing'])
    // Logged from the start: the setup's own lines in the work folder's log.
    // in a file named by its start (UTC), listing in time order; its real start, its duration.
    const logs = readdirSync(join(work, 'log'))
    t.is(logs.length, 1)
    t.ok(/^\d{8}T\d{6}Z\.log$/.test(logs[0]))
    t.ok(/^== \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ sh \S*haicc-setup\.sh .*\nhaicc-setup: base-package-haicc abcdef123456 .*\n(.*\n)*== exit 0, \d+(\.\d)? s\n$/.test(readFileSync(join(work, 'log', logs[0]), 'utf8')))
    // The first boot's stage 1, on a folder with no packages/ yet: the
    // runtime checked, HAICC's package copied in whole (hard links).
    const stage1 = run('sh', [join(work, 'boot')], { env: { ...process.env, HAICC_BOOT_LOGGING: '1' } })
    t.is(stage1.status, 0, stage1.stdout + stage1.stderr)
    t.ok(existsSync(join(work, 'haiccing', 'base-package-pkgm', 'package.json')), 'the setup carries the pair')
    t.ok(existsSync(join(work, 'packages', 'base-package-pkgm', 'package.json')), 'the cold boot copies the pair in')
    const inPackages = join(work, 'packages', 'base-package-haicc', 'modules', 'pear-full-square', 'haicc-base-boot', 'haicc.js')
    t.ok(existsSync(inPackages), stage1.stdout + stage1.stderr)
    t.is(statSync(inPackages).ino, statSync(join(work, 'haiccing', 'base-package-haicc', 'modules', 'pear-full-square', 'haicc-base-boot', 'haicc.js')).ino, 'a hard link: no space taken twice')
    t.ok(/exec bare "\$work\/packages\/base-package-haicc\/modules\/pear-full-square\/haicc-base-boot\/haicc\.js"/.test(readFileSync(join(work, 'haicc'), 'utf8')))
    // Nothing hidden: the work folder's shape.
    t.alike(readdirSync(work).sort(), ['bare', 'boot', 'haicc', 'haiccing', 'log', 'packages', 'shutdown'])
    // Again, the same setup: said, exit 0, nothing changed.
    // A damaged runtime: the setup says so, exit 1.
    const w3 = join(dir, 'work3')
    const damaged = join(dir, 'damaged.sh')
    writeFileSync(damaged, readFileSync(join(dir, 'haicc-setup.sh')))
    const bad = run('sh', ['-c', `sed 's/^\\(\\[ "\\$(sha256sum[^=]*= "\\)[0-9a-f]*/\\10000/' ${damaged} > ${damaged}.x && sh ${damaged}.x ${w3}`])
    t.is(bad.status, 1, bad.stdout)
    t.ok(/is not the one this setup carries/.test(bad.stdout), bad.stdout)
    const again = run('sh', [join(dir, 'haicc-setup.sh'), work])
    t.is(again.status, 0)
    t.ok(/already set up with this setup/.test(again.stdout))
    // Another setup over it: both named, a new folder said, exit 1, nothing changed.
    writeFileSync(join(work, 'haiccing', 'base-package-haicc', 'package.json'), JSON.stringify({ name: 'base-package-haicc', pkgm: { package: 'haicc', hash: '0123456789abcdef' } }))
    const other = run('sh', [join(dir, 'haicc-setup.sh'), work])
    t.is(other.status, 1)
    t.ok(/has base-package-haicc 0123456789ab \(boot .*\), this one is abcdef123456 .*use a new folder/s.test(other.stdout))
    // Without --sources: GitHub.
    run('sh', [join(dir, 'haicc-setup.sh'), join(dir, 'work2')])
    t.alike(readFileSync(join(dir, 'work2', 'haiccing', 'sources'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')), ['github haiccing'])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a path for a name is refused where it names a swarm\'s node; a strict swarm\'s nodes are its package\'s', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'names-'))
  const haicc = (args, swarm = '') => run(process.execPath, [join(here, 'haicc.js'), ...args], { env: { ...process.env, HAICC_WORK: work, HAICC_SWARM: swarm } })
  try {
    mkdirSync(join(work, 'hosts'))
    writeFileSync(join(work, 'swarms.json'), JSON.stringify({ swarms: { hosts: { package: 'base-x', swarm: 'hosts', strict: true } } }))
    writeFileSync(join(work, 'hosts', 'nodes.json'), JSON.stringify({ swarm: 'hosts', nodes: { master: { role: 'master' } } }))
    const r = haicc(['boot', 'hosts/master'])
    t.is(r.status, 2)
    t.ok(/'hosts\/master': one swarm's name here; a node is its swarm's: hosts\/haicc boot master/.test(r.stdout))
    t.ok(!existsSync(join(work, 'hosts-master')), 'nothing made')
    const s = haicc(['teardown', 'master'], 'hosts')
    t.is(s.status, 1, 'strict: no node torn down by hand')
    t.ok(/the swarm hosts is strict/.test(s.stdout))
    const b = haicc(['boot', 'node-9'], 'hosts')
    t.is(b.status, 1)
    t.ok(/strict: its nodes are its package's \(nodes.json: master\), node-9 is not one/.test(b.stdout), 'strict: a node not in nodes.json refused')
    const p = haicc(['teardown', 'a/b'], 'hosts')
    t.is(p.status, 2)
    t.ok(/one node's name here \(hosts\/haicc teardown <node>\)/.test(p.stdout))
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('a package\'s swarms: refused when not intact, not there, or --as with several', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-'))
  const put = (f, x) => { mkdirSync(dirname(join(work, f)), { recursive: true }); writeFileSync(join(work, f), typeof x === 'string' ? x : JSON.stringify(x)) }
  const haicc = args => run(process.execPath, [join(here, 'haicc.js'), ...args], { env: { ...process.env, HAICC_WORK: work, HAICC_SWARM: '' } })
  try {
    put('haiccing/base-x/package.json', { name: 'base-x', pkgm: { package: 'x', hash: 'abc' } })
    put('haiccing/base-x/swarms/a/nodes.json', { nodes: { master: { role: 'master' } } })
    const c = haicc(['boot', 'base-x'])
    t.is(c.status, 1)
    t.ok(/The package base-x: changed since it was written.*not deployed/.test(c.stdout), 'sealed and changed: refused')
    put('dev/base-y/swarms/a/nodes.json', { nodes: { master: { role: 'master' } } })
    put('dev/base-y/swarms/b/nodes.json', { nodes: { master: { role: 'master' } } })
    const m = haicc(['boot', 'base-y', '--from=dev', '--as=z'])
    t.is(m.status, 2)
    t.ok(/no hash recorded: mixed/.test(m.stdout), 'from --from without a hash: mixed, said')
    t.ok(/--as names a single swarm; base-y has 2 \(a, b\)/.test(m.stdout))
    const n = haicc(['boot', 'base-y/c', '--from=dev'])
    t.is(n.status, 1)
    t.ok(/no swarm c in it \(swarms\/: a, b\)/.test(n.stdout))
    t.ok(!existsSync(join(work, 'swarms.json')), 'nothing made')
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('a test booted by its URI: in place first, then each booted one in its run, torn down; its result its exit code', (t) => {
  const work = mkdtempSync(join(tmpdir(), 'tests-'))
  const put = (f, s, x = false) => { mkdirSync(dirname(join(work, f)), { recursive: true }); writeFileSync(join(work, f), s); if (x) chmodSync(join(work, f), 0o755) }
  try {
    const pkg = 'haiccing/base-x'
    put(`${pkg}/package.json`, JSON.stringify({ name: 'base-x', pkgm: { package: 'x', hash: 'abc' } }))
    put(`${pkg}/test/full.json`, JSON.stringify({ modules: false, tests: ['a', 'b'] }))
    put(`${pkg}/test/a/test`, '#!/bin/sh\necho "# tests 1"\necho "# pass 1"\n', true)
    // A booted test: its cold boot runs in its run, with what it is told.
    put(`${pkg}/test/b/boot`, '#!/bin/sh\nprintf "in %s, " "$(basename "$PWD")"; echo "the package $(basename "$HAICC_PACKAGE")"\n[ "$HAICC_RUN" = "$PWD" ] && touch made\n', true)
    put(`${pkg}/test/c/boot`, '#!/bin/sh\necho broken\nexit 3\n', true)
    put(`${pkg}/test/d/boot`, '#!/bin/sh\nexit 0\n', true)
    put(`${pkg}/test/d/teardown`, '#!/bin/sh\necho "its own teardown"\nrm -rf "$HAICC_RUN"\n', true)
    const haicc = (...args) => run(process.execPath, [join(here, 'haicc.js'), 'boot', ...args], { env: { ...process.env, HAICC_WORK: work, HAICC_SWARM: '', HAICC_NOLOG: '' } })
    const set = haicc('base-x/test')
    t.is(set.status, 0, set.stdout)
    t.ok(/ok {5}base-x\/test\/a \(1\/1/.test(set.stdout))
    t.ok(/ {2}\| in b, the package base-x\n/.test(set.stdout))
    t.ok(/torn down: swarms\/test\/b\//.test(set.stdout))
    t.ok(/Passed: 2 passed, 0 failed, 0 skipped/.test(set.stdout))
    t.ok(!existsSync(join(work, 'swarms')), 'its run removed, no empty folders left')
    // One test, failing: its exit code is the result; torn down all the same.
    const c = haicc('base-x/test/c')
    t.is(c.status, 1)
    t.ok(/FAILED base-x\/test\/c \(.* s, exit 3\)/.test(c.stdout))
    // --keep: its run left to look at.
    t.is(haicc('base-x/test/b', '--keep').status, 0)
    t.ok(existsSync(join(work, 'swarms', 'test', 'b', 'made')))
    // Its own teardown.
    t.ok(/\| its own teardown/.test(haicc('base-x/test/d').stdout))
    t.is(haicc('base-x/test/nope').status, 1)
    // Logged: the root's log has what it printed.
    t.ok(/in b, the package base-x/.test(readdirSync(join(work, 'log')).map(f => readFileSync(join(work, 'log', f), 'utf8')).join('')))
  } finally { rmSync(work, { recursive: true, force: true }) }
})

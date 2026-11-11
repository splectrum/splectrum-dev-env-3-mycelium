// The boot's release, for this platform, built into the local sources
// (sources/ here, gitignored; docs/design/packages.md, "The boot mrepo: the
// root"), with what it needs beside it:
//   sources/haiccing/base-package-boot-<platform>   the release: a standalone
//                                           executable (bare-build --standalone:
//                                           Bare built in, the boot package embedded)
//   sources/haiccing/base-package-runtime.bundle    the packages the boot mrepo lists
//                                           (tools/package-bundle.js), in
//   sources/haiccing/manifest.json          their manifest
//   sources/addons/<sha256>                 their native addons
//   sources/holepunchto/<tarball>           the prerequisite Bare it puts in place:
//                                           the one built into the executable (its
//                                           version and sha512 pinned in its bare.json)
//   sources/haiccing/base-package-boot-<platform>.json   what it is: the platform,
//                                           Bare, the commit, how to run it
// The boot package staged (its mrepo/ as the module mrepo-files.js; its
// bare.json the built-in Bare), so nothing in haiccing/ changes.
//   tools/bare tools/boot-release.js [--out=<folder>]     (default: sources/ here)
// Then, from this repository's folder:
//   sources/haiccing/base-package-boot-<platform> --work=<folder> --sources=folder:sources --yes
import process from 'bare-process'
import os from 'bare-os'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, lstatSync, cpSync, chmodSync, renameSync } from 'bare-fs'
import { join, resolve, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { spawnSync } from 'bare-subprocess'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const flag = (n, d) => process.argv.slice(2).find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const out = resolve(flag('out', join(dev, 'sources')))
const platform = `${os.platform()}-${os.arch()}`
const bareBuild = join(dev, 'node_modules', '.bin', 'bare-build')
const tool = (...a) => { const r = spawnSync(join(dev, 'tools', 'bare'), a, { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`failed: ${a.join(' ')}`) }
const sh = (cmd, a, opts = {}) => { const r = spawnSync(cmd, a, { stdio: ['ignore', 'pipe', 'inherit'], ...opts }); if (r.status !== 0) throw new Error(`failed: ${cmd} ${a.join(' ')}`); return r.stdout.toString().trim() }
const files = (dir, at = '') => readdirSync(join(dir, at)).sort().flatMap(n => {
  const p = at ? `${at}/${n}` : n
  return lstatSync(join(dir, p)).isDirectory() ? files(dir, p) : [p]
})
if (!existsSync(bareBuild)) { console.error('bare-build is missing: npm install --ignore-scripts'); process.exit(2) }

mkdirSync(out, { recursive: true })
const tmp = join(out, '.stage')
rmSync(tmp, { recursive: true, force: true })

// The Bare built into a standalone: a probe built and asked.
mkdirSync(join(tmp, 'probe'), { recursive: true })
writeFileSync(join(tmp, 'probe', 'package.json'), '{ "name": "probe", "type": "module" }\n')
writeFileSync(join(tmp, 'probe', 'probe.js'), 'console.log(Bare.version)\n')
sh(bareBuild, ['--standalone', '--base', join(tmp, 'probe'), '--out', join(tmp, 'probe-out'), join(tmp, 'probe', 'probe.js')])
const version = sh(join(tmp, 'probe-out', 'probe'), []).replace(/^v/, '')
// Its tarball as npm's registry publishes it (curl: no npm needed).
const meta = JSON.parse(sh('curl', ['-fsSL', '--retry', '3', `https://registry.npmjs.org/bare-runtime-${platform}/${version}`]))
const integrity = meta.dist.integrity
console.log(JSON.stringify({ bare: version, integrity }))

// 1. The packages: modules assembled; the runtime's bundle into the sources.
tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', 'base-package-runtime'))
tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', 'base-package-boot'))
tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'base-package-runtime'), `--out=${out}`)

// 2. Bare's tarball, as npm publishes it, by its organisation.
// (kept when there: npm's tarball, the same bytes)
mkdirSync(join(out, 'holepunchto'), { recursive: true })
const tarball = join(out, 'holepunchto', `bare-runtime-${platform}-${version}.tgz`)
if (!existsSync(tarball)) sh('curl', ['-fsSL', '--retry', '3', '-o', tarball, meta.dist.tarball])

// 3. The boot package staged: its mrepo/ as a module, its Bare pinned.
const stage = join(tmp, 'base-package-boot')
cpSync(join(dev, 'haiccing', 'base-package-boot'), stage, { recursive: true, verbatimSymlinks: true })
const embedded = Object.fromEntries(files(join(stage, 'mrepo')).map(p => [p, readFileSync(join(stage, 'mrepo', p)).toString('base64')]))
writeFileSync(join(stage, 'mrepo-files.js'), `// The boot mrepo's structure, embedded (tools/boot-release.js).\nexport default ${JSON.stringify(embedded, null, 1)}\n`)
writeFileSync(join(stage, 'bare.json'), JSON.stringify({ description: 'The Bare the boot puts in place, pinned: the one built into it.', version, integrity }, null, 2) + '\n')

// 4. The standalone executable.
sh(bareBuild, ['--standalone', '--base', stage, '--out', join(tmp, 'boot-out'), join(stage, 'run.js')])
const exe = readdirSync(join(tmp, 'boot-out'))[0]
const release = join(out, 'haiccing', `base-package-boot-${platform}`)
mkdirSync(dirname(release), { recursive: true })
rmSync(release, { force: true })
renameSync(join(tmp, 'boot-out', exe), release)
chmodSync(release, 0o755)
rmSync(tmp, { recursive: true, force: true })

const commit = spawnSync('git', ['-C', dev, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).stdout?.toString().trim() || null
writeFileSync(`${release}.json`, JSON.stringify({ package: 'haiccing/base-package-boot', platform, bare: { version, integrity }, commit, run: `sources/haiccing/base-package-boot-${platform} --work=<folder> --sources=folder:sources --yes` }, null, 2) + '\n')
console.log(JSON.stringify({ release, sources: out }))

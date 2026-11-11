// The boot's release, for this platform (docs/design/packages.md, "The boot
// mrepo: the root"): a standalone executable (bare-build --standalone: Bare
// built in, the boot package embedded) and the sources it needs beside it:
//   <out>/base-package-boot                 the executable
//   <out>/sources/haiccing/                 the packages the boot mrepo lists, as
//                                           bundles (tools/package-bundle.js), their manifest
//   <out>/sources/addons/<sha256>           their native addons
//   <out>/sources/holepunchto/<tarball>     the Bare it puts in place: the one built
//                                           into the executable (its version and
//                                           sha512 pinned in its bare.json)
//   <out>/release.json                      what it is: the platform, Bare, the commit
// The boot package staged first (its mrepo/ as the module mrepo-files.js; its
// bare.json the built-in Bare), so nothing in haiccing/ changes.
//   tools/bare tools/boot-release.js [--out=<folder>]     (default: release/ here, gitignored)
// Then:  <out>/base-package-boot --work=<folder> --sources=folder:<out>/sources --yes
import process from 'bare-process'
import os from 'bare-os'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, lstatSync, cpSync, chmodSync, renameSync } from 'bare-fs'
import { join, resolve, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { spawnSync } from 'bare-subprocess'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const flag = (n, d) => process.argv.slice(2).find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const out = resolve(flag('out', join(dev, 'release')))
const platform = `${os.platform()}-${os.arch()}`
const bareBuild = join(dev, 'node_modules', '.bin', 'bare-build')
const tool = (...a) => { const r = spawnSync(join(dev, 'tools', 'bare'), a, { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`failed: ${a.join(' ')}`) }
const sh = (cmd, a, opts = {}) => { const r = spawnSync(cmd, a, { stdio: ['ignore', 'pipe', 'inherit'], ...opts }); if (r.status !== 0) throw new Error(`failed: ${cmd} ${a.join(' ')}`); return r.stdout.toString().trim() }
const files = (dir, at = '') => readdirSync(join(dir, at)).sort().flatMap(n => {
  const p = at ? `${at}/${n}` : n
  return lstatSync(join(dir, p)).isDirectory() ? files(dir, p) : [p]
})
if (!existsSync(bareBuild)) { console.error('bare-build is missing: npm install --ignore-scripts'); process.exit(2) }

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'sources'), { recursive: true })
const tmp = join(out, '.stage')

// The Bare built into a standalone: a probe built and asked.
mkdirSync(join(tmp, 'probe'), { recursive: true })
writeFileSync(join(tmp, 'probe', 'package.json'), '{ "name": "probe", "type": "module" }\n')
writeFileSync(join(tmp, 'probe', 'probe.js'), 'console.log(Bare.version)\n')
sh(bareBuild, ['--standalone', '--base', join(tmp, 'probe'), '--out', join(tmp, 'probe-out'), join(tmp, 'probe', 'probe.js')])
const version = sh(join(tmp, 'probe-out', 'probe'), []).replace(/^v/, '')
const integrity = sh('npm', ['view', `bare-runtime-${platform}@${version}`, 'dist.integrity'])
console.log(JSON.stringify({ bare: version, integrity }))

// 1. The packages: modules assembled; the runtime's bundle into the sources.
tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', 'base-package-runtime'))
tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', 'base-package-boot'))
tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'base-package-runtime'), `--out=${join(out, 'sources')}`)

// 2. Bare's tarball, as npm publishes it, by its organisation.
mkdirSync(join(out, 'sources', 'holepunchto'), { recursive: true })
sh('npm', ['pack', `bare-runtime-${platform}@${version}`, '--pack-destination', join(out, 'sources', 'holepunchto')])

// 3. The boot package staged: its mrepo/ as a module, its Bare pinned.
const stage = join(tmp, 'base-package-boot')
cpSync(join(dev, 'haiccing', 'base-package-boot'), stage, { recursive: true, verbatimSymlinks: true })
const embedded = Object.fromEntries(files(join(stage, 'mrepo')).map(p => [p, readFileSync(join(stage, 'mrepo', p)).toString('base64')]))
writeFileSync(join(stage, 'mrepo-files.js'), `// The boot mrepo's structure, embedded (tools/boot-release.js).\nexport default ${JSON.stringify(embedded, null, 1)}\n`)
writeFileSync(join(stage, 'bare.json'), JSON.stringify({ description: 'The Bare the boot puts in place, pinned: the one built into it.', version, integrity }, null, 2) + '\n')

// 4. The standalone executable.
sh(bareBuild, ['--standalone', '--base', stage, '--out', join(tmp, 'boot-out'), join(stage, 'run.js')])
const exe = readdirSync(join(tmp, 'boot-out'))[0]
renameSync(join(tmp, 'boot-out', exe), join(out, 'base-package-boot'))
chmodSync(join(out, 'base-package-boot'), 0o755)
rmSync(tmp, { recursive: true, force: true })

const commit = spawnSync('git', ['-C', dev, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).stdout?.toString().trim() || null
writeFileSync(join(out, 'release.json'), JSON.stringify({ package: 'haiccing/base-package-boot', platform, bare: { version, integrity }, commit, run: './base-package-boot --work=<folder> --sources=folder:<this folder>/sources --yes' }, null, 2) + '\n')
console.log(JSON.stringify({ release: out, files: files(out).length }))

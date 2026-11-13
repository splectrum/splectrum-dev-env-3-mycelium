// The release, built into the local sources (sources/ here, gitignored):
// everything an install needs, by organisation.
//   sources/haiccing/<package>.bundle   each package here (a folder of
//                                       haiccing/ whose package.json names
//                                       its modules): assembled, then bundled
//                                       (tools/package-assemble.js,
//                                       tools/package-bundle.js), in
//   sources/haiccing/manifest.json      their manifest
//   sources/addons/<sha256>             their native addons
//   sources/holepunchto/<tarball>       Bare's runtime, third party: the
//                                       tarball this repository's lockfile
//                                       pins (bare-runtime-<platform>),
//                                       fetched once, checked against its
//                                       sha512
//   sources/third-party.json            the third-party components: each its
//                                       file, where it comes from, its sha512
//   haiccing/base-linux-haicc/pins      Bare's pin, for the haicc scripts,
//                                       brought in line with the lockfile;
//   haiccing/base-linux-haicc/haicc-install.sh   its installer written
//                                       again (its build.sh)
// No executable: the boot is its bundle, run with Bare
// (haiccing/base-linux-haicc: haicc boot/deploy).
// Each package's test report against the bundle built (tools/lib/report.js:
// current, stale, failed, none) is said in the result; --strict: exit 1
// unless every one is current (a release to publish: every package tested
// as it is; a package's pre-release, tools/package-test.js, writes it).
//   tools/bare tools/release.js [--out=<folder>] [--strict]     (default: sources/ here)
import process from 'bare-process'
import os from 'bare-os'
import crypto from 'bare-crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'bare-fs'
import { join, resolve, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { spawnSync } from 'bare-subprocess'
import { statusOf } from './lib/report.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const flag = (n, d) => process.argv.slice(2).find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const out = resolve(flag('out', join(dev, 'sources')))
const platform = `${os.platform()}-${os.arch()}`
const tool = (...a) => { const r = spawnSync(join(dev, 'tools', 'bare'), a, { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`failed: ${a.join(' ')}`) }

// 1. The packages: each assembled (its modules/, node_modules included:
// gitignored, so not there in a fresh clone), then bundled into the sources.
const packages = readdirSync(join(dev, 'haiccing')).sort().filter(p => {
  const f = join(dev, 'haiccing', p, 'package.json')
  return existsSync(f) && Array.isArray(JSON.parse(readFileSync(f, 'utf8')).modules)
})
for (const p of packages) {
  tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', p))
  tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', p), `--out=${out}`)
}

// 2. Bare's runtime, as the lockfile pins it: its tarball, by its
// organisation; kept when there and as pinned.
const lock = JSON.parse(readFileSync(join(dev, 'package-lock.json'), 'utf8')).packages[`node_modules/bare-runtime-${platform}`]
if (!lock) throw new Error(`no bare-runtime-${platform} in package-lock.json`)
const want = Buffer.from(lock.integrity.replace(/^sha512-/, ''), 'base64').toString('hex')
const sha512 = f => crypto.createHash('sha512').update(readFileSync(f)).digest('hex')
const file = `holepunchto/bare-runtime-${platform}-${lock.version}.tgz`
mkdirSync(join(out, 'holepunchto'), { recursive: true })
if (!existsSync(join(out, file)) || sha512(join(out, file)) !== want) {
  const r = spawnSync('curl', ['-fsSL', '--retry', '3', '-o', join(out, file), lock.resolved], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`could not fetch Bare's runtime: ${lock.resolved}`)
}
if (sha512(join(out, file)) !== want) throw new Error(`Bare's runtime is not as pinned (sha512): ${file}`)
const third = { description: 'The third-party components an install needs: each its file here, where it comes from, its sha512.', components: { bare: { file, version: lock.version, platform, url: lock.resolved, sha512: want } } }
writeFileSync(join(out, 'third-party.json'), JSON.stringify(third, null, 2) + '\n')

// 3. The haicc scripts: their pin of Bare the lockfile's, their installer
// written from them (the package's own build.sh).
const linux = join(dev, 'haiccing', 'base-linux-haicc')
const pins = readFileSync(join(linux, 'pins'), 'utf8')
const pinned = { BARE_VERSION: lock.version, BARE_PLATFORM: platform, BARE_FILE: file, BARE_URL: lock.resolved, BARE_SHA512: want }
const next = pins.split('\n').map(l => { const k = l.split('=')[0]; return k in pinned ? `${k}=${pinned[k]}` : l }).join('\n')
if (next !== pins) writeFileSync(join(linux, 'pins'), next)
const built = spawnSync('sh', [join(linux, 'build.sh')], { stdio: ['ignore', 'ignore', 'inherit'] })
if (built.status !== 0) throw new Error('failed: base-linux-haicc/build.sh')

// 4. The test reports: each package's against the bundle just built.
const manifest = JSON.parse(readFileSync(join(out, 'haiccing', 'manifest.json'), 'utf8')).packages
const reports = Object.fromEntries(packages.map(p => [`haiccing/${p}`, statusOf(join(dev, 'haiccing', p), manifest[`haiccing/${p}`]?.content)]))

const commit = spawnSync('git', ['-C', dev, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).stdout?.toString().trim() || null
console.log(JSON.stringify({ sources: out, packages: packages.map(p => `haiccing/${p}`), reports, bare: lock.version, commit }))
if (process.argv.includes('--strict') && Object.values(reports).some(r => r !== 'current')) {
  console.error(`not every package's test report is current: ${Object.entries(reports).filter(([, r]) => r !== 'current').map(([p, r]) => `${p} (${r})`).join(', ')}`)
  process.exit(1)
}

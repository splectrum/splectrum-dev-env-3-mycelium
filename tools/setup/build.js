// The setup, from the package writer's signed source (<out>/source):
//   tools/bare tools/setup/build.js --source=<folder> --out=<folder> --public-key=<file> [--sources=<file>]
// <out>/setup/          the source (manifest.json, <org>/<package>.bundle, addons/),
//                       Bare (bare), boot.json (the publisher's public key,
//                       the other sources: --sources, a JSON list)
// <out>/haicc-setup.sh  the shell header (tools/setup/header.sh) and the
//                       setup folder packed behind it (tar.gz)
// The manifest must be signed by the given key, and list base-package-boot.
import process from 'bare-process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, chmodSync, existsSync, readdirSync, realpathSync } from 'bare-fs'
import { join, dirname, resolve } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { spawnSync } from 'bare-subprocess'
import { verify } from '../../pear-full-square/pkgm-base-manager/lib/sign.js'

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)] }))
for (const f of ['source', 'out', 'public-key']) if (!flags[f]) { console.error(`--${f}=… needed`); process.exit(2) }
const here = dirname(fileURLToPath(import.meta.url))
const dev = join(here, '..', '..')
const source = resolve(flags.source)
const out = resolve(flags.out)
const publicKey = readFileSync(flags['public-key'], 'utf8').trim()
const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'))
if (!verify(manifest, publicKey)) { console.error('the manifest is not signed by that key'); process.exit(1) }
const BOOT = 'haiccing/base-package-boot'
const boot = manifest.packages[BOOT]
if (!boot) { console.error(`the manifest has no ${BOOT}`); process.exit(1) }

const setup = join(out, 'setup')
rmSync(setup, { recursive: true, force: true })
mkdirSync(join(setup, 'addons'), { recursive: true })
copyFileSync(join(source, 'manifest.json'), join(setup, 'manifest.json'))
for (const org of readdirSync(source)) {
  if (org === 'addons' || !existsSync(join(source, org)) || org.includes('.')) continue
  mkdirSync(join(setup, org), { recursive: true })
  for (const n of readdirSync(join(source, org))) if (n.endsWith('.bundle')) copyFileSync(join(source, org, n), join(setup, org, n))
}
for (const a of readdirSync(join(source, 'addons'))) copyFileSync(join(source, 'addons', a), join(setup, 'addons', a))
// Bare's runtime, as this repository has it, stripped of its symbols.
const bare = realpathSync(join(dev, 'node_modules', 'bare-runtime-linux-x64', 'bin', 'bare'))
copyFileSync(bare, join(setup, 'bare'))
chmodSync(join(setup, 'bare'), 0o755)
spawnSync('strip', [join(setup, 'bare')], { stdio: 'ignore' })
const sources = flags.sources ? JSON.parse(readFileSync(flags.sources, 'utf8')) : []
writeFileSync(join(setup, 'boot.json'), JSON.stringify({ publicKey, sources }, null, 2) + '\n')

const payload = join(out, 'payload.tar.gz')
const tar = spawnSync('tar', ['-czf', payload, '-C', setup, '.'], { stdio: 'inherit' })
if (tar.status !== 0) process.exit(1)
const header = readFileSync(join(here, 'header.sh'), 'utf8').replaceAll('@BOOTSHA@', boot.sha256).replaceAll('@BOOT@', `${BOOT}.bundle`)
writeFileSync(join(out, 'haicc-setup.sh'), Buffer.concat([Buffer.from(header), readFileSync(payload)]))
chmodSync(join(out, 'haicc-setup.sh'), 0o755)
rmSync(payload)
const size = readFileSync(join(out, 'haicc-setup.sh')).length
console.log(JSON.stringify({ setup, script: join(out, 'haicc-setup.sh'), bytes: size, sequence: manifest.sequence, packages: Object.keys(manifest.packages), boot: boot.sha256.slice(0, 12) }))

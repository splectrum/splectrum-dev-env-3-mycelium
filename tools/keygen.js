// The publisher's key pair: the secret half signs each release's manifest
// (kept by its holder only, never in a repository, never printed); the
// public half goes into every setup's boot.json.
//   tools/bare tools/keygen.js <folder>   -> <folder>/publisher.secret (0600), publisher.public
import process from 'bare-process'
import { writeFileSync, mkdirSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { keyPair } from '../pear-full-square/pkgm-base-manager/lib/sign.js'

const [dir] = process.argv.slice(2)
if (!dir) { console.error('usage: keygen.js <folder>'); process.exit(2) }
if (existsSync(join(dir, 'publisher.secret'))) { console.error(`a key is there already: ${dir} (never overwritten)`); process.exit(1) }
mkdirSync(dir, { recursive: true, mode: 0o700 })
const k = keyPair()
writeFileSync(join(dir, 'publisher.secret'), k.secretKey + '\n', { mode: 0o600 })
writeFileSync(join(dir, 'publisher.public'), k.publicKey + '\n')
console.log(JSON.stringify({ publicKey: k.publicKey, secret: join(dir, 'publisher.secret') }))

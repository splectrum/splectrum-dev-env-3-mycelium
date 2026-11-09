// A release's tag, from the packages' identities in its manifest (each
// package's key, id and addons), not from the build: the same packages, the
// same tag; any package changed, a new one.
//   tools/bare tools/setup/tag.js <manifest.json>   -> setup-<12 hex>
import process from 'bare-process'
import { readFileSync } from 'bare-fs'
import crypto from 'bare-crypto'

const m = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const ids = Object.keys(m.packages).sort().map(k => `${k}:${m.packages[k].id}:${(m.packages[k].addons || []).join(',')}`).join(';')
console.log('setup-' + crypto.createHash('sha256').update(ids).digest('hex').slice(0, 12))

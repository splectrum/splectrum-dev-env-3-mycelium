// A package manifest signed by its publisher: ed25519 (sodium), over the
// manifest's canonical form (its keys sorted, no whitespace), the signature
// beside it. The boot carries the publisher's public key; a manifest from
// any source is accepted only if its signature checks (docs/design/
// structure.md, "Packages as bundles": the manifest signed, updatable).
//   const { publicKey, secretKey } = keyPair()        hex
//   const signed = sign(manifest, secretKey)          { ...manifest, signature }
//   verify(signed, publicKey)                         true | false
import sodium from 'sodium-native'

export const canonical = v => Array.isArray(v)
  ? '[' + v.map(canonical).join(',') + ']'
  : v !== null && typeof v === 'object'
    ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'
    : JSON.stringify(v)

const body = m => { const { signature, ...rest } = m; return Buffer.from(canonical(rest)) }

export function keyPair () {
  const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_keypair(publicKey, secretKey)
  return { publicKey: publicKey.toString('hex'), secretKey: secretKey.toString('hex') }
}

export function sign (manifest, secretKey) {
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, body(manifest), Buffer.from(secretKey, 'hex'))
  return { ...manifest, signature: signature.toString('hex') }
}

export function verify (manifest, publicKey) {
  if (typeof manifest?.signature !== 'string' || !/^[0-9a-f]{128}$/.test(manifest.signature)) return false
  if (typeof publicKey !== 'string' || !/^[0-9a-f]{64}$/.test(publicKey)) return false
  return sodium.crypto_sign_verify_detached(Buffer.from(manifest.signature, 'hex'), body(manifest), Buffer.from(publicKey, 'hex'))
}

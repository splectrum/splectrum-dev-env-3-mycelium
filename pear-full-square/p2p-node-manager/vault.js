// The vault, a stand-in: each node's primary key as a file the owner alone
// can read, in a folder of its own on the host, outside every repository,
// node folder and image. Not yet encrypted (the vault's design is open:
// notes/node-pattern.md); the key is generated here, where it lives, and
// handed to the node only through its stdin, into memory.
//   const v = vault(dir)
//   v.keyFor(swarm, node)       the node's key (hex), generated if new
//   v.has(swarm, node)

import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'bare-fs'
import { join } from 'bare-path'
import { randomBytes } from 'bare-crypto'

export function vault (dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  chmodSync(dir, 0o700)
  // Names are valid here: they were validated where they came in (the
  // managers' command lines).
  const file = (swarm, node) => join(dir, `${swarm}--${node}.key`)
  return {
    has: (swarm, node) => existsSync(file(swarm, node)),
    keyFor (swarm, node) {
      const f = file(swarm, node)
      if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' })
      return readFileSync(f, 'utf8').trim()
    }
  }
}

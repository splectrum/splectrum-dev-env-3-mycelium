// The instance a kick runs on: a native repository (bare, or a checkout's
// top), or a repository on the p2p layer: an instance folder holding a
// p2p-store (store/) whose repository `repo` is the instance.
//   const { kind, backend, close } = await openInstance(dir, { code })
// `code` is the folder the modules are in (the deployed tree, or the dev
// repository's root): native instances use its mycelium-git, p2p ones its
// p2p-mrepo engine. A p2p instance's store is open in one process at a time.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function openInstance (dir, { code }) {
  const from = path => import(pathToFileURL(join(code, path)).href)
  if (existsSync(join(dir, 'store'))) {
    const { openBackend } = await from('p2p-mrepo/engine.js')
    const opened = await openBackend(join(dir, 'store'))
    return { kind: 'p2p-mrepo', backend: opened.backend, close: opened.close }
  }
  const { nativeBackend } = await from('mycelium-git/index.js')
  return { kind: 'native', backend: nativeBackend(dir), close: async () => {} }
}

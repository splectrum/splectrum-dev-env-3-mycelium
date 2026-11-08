// An engine for mycelium-git's CLI (`--engine=<this module>`): the
// repository `repo` of the p2p-store at `storage`, opened for one
// invocation. The store is opened without a primary key (it generates and
// keeps its own): for tests and test runs, not for a node's secrets.
//   openBackend(storage) → { backend, close }

import { openStore } from 'p2p-store'
import { mrepos } from './index.js'

export async function openBackend (storage, { name = 'repo' } = {}) {
  const store = await openStore({ storage })
  const repo = await mrepos({ store }).open(name)
  return { backend: repo.backend, repo, close: () => store.close() }
}

// mycelium-git's contract suite on a repository on the p2p layer: the
// fixture imported into a p2p-mrepo repository, then the same tests as on
// every other engine.

import test from 'brittle'
import { existsSync, mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openStore } from 'p2p-store'
import { contract } from '../../mycelium-git/test/contract.js'
import { mrepos } from '../index.js'

const open = []

let n = 0
async function onMrepo (gitdir) {
  const store = await openStore({ storage: mkdtempSync(join(tmpdir(), 'p2p-mrepo-contract-')) })
  open.push(store)
  const repos = mrepos({ store })
  const name = `repo-${++n}`
  const repo = existsSync(join(gitdir, 'HEAD'))
    ? await repos.import(name, { native: gitdir })
    : await repos.create(name)
  return repo.backend
}

contract('p2p-mrepo', onMrepo)

// Last, the stores this file opened, closed.
test('its stores closed', async (t) => { for (const s of open) await s.close(); t.pass() })

// The contract suite on p2p-git with a Hyperdrive as its filesystem,
// through p2p-git's own adapter (hyperdrive-fs.js): the fixture copied into
// a drive (on a Corestore of its own), then the same tests as on every
// other engine. Corestore and Hyperdrive are development dependencies, for
// this test only: storage on Hypercore belongs below mycelium.

import test from 'brittle'
import { existsSync, mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { createFs } from 'p2p-git/hyperdrive-fs'
import { contract } from './contract.js'
import { nativeBackend, p2pgitBackend, transfer } from '../index.js'

const open = []

async function onHyperdrive (dir) {
  const store = new Corestore(mkdtempSync(join(tmpdir(), 'corestore-')))
  open.push(store)
  const drive = new Hyperdrive(store)
  await drive.ready()
  const backend = p2pgitBackend('/', { fs: createFs(drive) })
  if (existsSync(join(dir, 'HEAD'))) {
    // A fixture on disk: copied into the drive, objects and branches.
    await backend.init()
    const fixture = nativeBackend(dir)
    for (const [name, commit] of await fixture.listBranches()) {
      await transfer(fixture, backend, commit)
      await backend.updateBranch(name, commit, null)
    }
  }
  return backend
}

contract('p2p-git on Hyperdrive', onHyperdrive)

// Last, the stores this file opened, closed.
test('its stores closed', async (t) => { for (const s of open) await s.close(); t.pass() })

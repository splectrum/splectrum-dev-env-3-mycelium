#!/usr/bin/env bare
// The boundary for p2p-mrepo's repositories, from the command line.
//   node cli.js create <storage> [name]                 a new, empty repository
//   node cli.js import <storage> <native-repo> [name]   a native repository's
//                                                       branches, with history
//   node cli.js export <storage> <bundle> [name]        every branch, as a bundle
//   node cli.js extract <storage> <layer> <folder> [name]  a layer's tree as a
//                                                       folder (layer/extract)
// (default name: repo). Everything else is mycelium-git's CLI with this
// module as its engine: node ../mycelium-git/cli.js --engine=../p2p-mrepo/engine.js ...
// Prints one JSON line, {"result": ...} or {"error": "..."} with exit 1.

import fs from 'bare-fs'
import process from 'bare-process'
import { openStore } from 'p2p-store'
import { writeBundle } from '../mycelium-git/index.js'
import { extract } from '../mycelium-layer/index.js'
import { mrepos } from './index.js'
import { validateName } from '../mycelium-uri/index.js'

const args = process.argv.slice(2)
const [op, storage, path] = args
const name = (op === 'extract' ? args[4] : op === 'create' ? args[2] : args[3]) || 'repo'
let store = null
try {
  // The boundary: the name from the command line, validated once.
  validateName(name, 'repository name')
  store = await openStore({ storage })
  const repos = mrepos({ store })
  let result
  if (op === 'create') {
    const repo = await repos.create(name)
    result = { name, id: repo.id, key: repo.key }
  } else if (op === 'import') {
    const repo = await repos.import(name, { native: path })
    result = { name, id: repo.id, branches: repo.branches, objects: repo.objects }
  } else if (op === 'export') {
    const repo = await repos.open(name)
    const branches = Object.fromEntries(await repo.backend.listBranches())
    const bytes = await writeBundle(repo.backend, branches)
    fs.writeFileSync(path, bytes)
    result = { name, branches: Object.keys(branches).length, bytes: bytes.length }
  } else if (op === 'extract') {
    const repo = await repos.open(name)
    const r = await extract({ backend: repo.backend, layer: path, folder: args[3] })
    result = { name, layer: path, commit: r.commit, files: r.files }
  } else {
    throw new Error(`unknown op: ${op}`)
  }
  console.log(JSON.stringify({ result }))
} catch (err) {
  console.log(JSON.stringify({ error: err.message }))
  process.exitCode = 1
} finally {
  if (store) await store.close()
}

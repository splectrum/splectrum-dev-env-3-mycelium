// An mrepo built from its structure (docs/design/packages.md, "Installing an
// mrepo from its structure"): a folder laid out by layers, a layer.json at
// each leaf, written as a standalone repository on disk, p2p-git's hybrid
// with every layer on the filesystem (the setting's `filesystem` storage).
//   build({ from, work, name, time })  from: the mrepo/ folder; the repository
//                                     written at <work>/mrepos/<name>/.git, one
//                                     layer per leaf (an orphan branch, its
//                                     files as one commit, layer.json with
//                                     them), the inbox layer's files also its
//                                     working tree (<work>/mrepos/<name>/inbox);
//                                     <work>/mrepo.json written. time (seconds):
//                                     every commit's, so the same folder builds
//                                     the same repository. Resolves
//                                     { name, layers: { layer: commit } }.
import fs, { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { p2pgitBackend, writer } from 'mycelium-git'
import { gitdirOf, viewOf, SETTING } from 'mrepo-base-request'

const CONFIG = 'layer.json'
const author = { name: 'mrepo-build', email: 'mrepo-build@localhost' }

// The leaves: each folder holding a layer.json, by its path (the layer's name).
function leaves (root, rel = '') {
  const dir = join(root, rel)
  if (existsSync(join(dir, CONFIG))) return [rel]
  return readdirSync(dir).sort().filter(n => statSync(join(dir, n)).isDirectory())
    .flatMap(n => leaves(root, rel ? `${rel}/${n}` : n))
}

// A leaf's files, by path inside it.
function files (dir, rel = '') {
  return readdirSync(join(dir, rel)).sort().flatMap(n => {
    const p = rel ? `${rel}/${n}` : n
    return statSync(join(dir, p)).isDirectory() ? files(dir, p) : [p]
  })
}

export async function build ({ from, work, name, time = Math.floor(Date.now() / 1000) }) {
  const gitdir = gitdirOf(work, name)
  if (existsSync(gitdir)) throw new Error(`exists: ${gitdir}`)
  mkdirSync(gitdir, { recursive: true })
  const backend = p2pgitBackend(gitdir, { fs })
  await backend.init()
  const w = writer(backend)
  const at = { author, time: time * 1000 }
  const layers = {}
  for (const l of leaves(from)) {
    await w.createLayer(l, `Create ${l}`, at)
    const c = await w.change(l)
    for (const f of files(join(from, l))) await c.put(`/${f}`, readFileSync(join(from, l, f)))
    layers[l] = await c.commit(`Built ${l}`, at)
  }
  // The inbox's working tree: its files, as committed.
  if (layers.inbox) {
    const inbox = join(viewOf(work, name), 'inbox')
    mkdirSync(inbox, { recursive: true })
    for (const f of files(join(from, 'inbox'))) copyFileSync(join(from, 'inbox', f), join(inbox, f))
  }
  writeFileSync(join(work, SETTING), JSON.stringify({ storage: 'filesystem', name }) + '\n')
  return { name, layers }
}

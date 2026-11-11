// build({ from, work, name, dir, time, setting }): an mrepo built from its structure (README.md beside it).
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

export async function build ({ from, work = null, name = null, dir = null, time = Math.floor(Date.now() / 1000), setting = true }) {
  // where: <dir> (a child inside its parent), else <work>/mrepos/<name>
  const view = dir ?? viewOf(work, name)
  const gitdir = join(view, '.git')
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
  // The boxes' working folders, their files as committed: the inbox (input
  // through the filesystem), the outbox (output: there before any record,
  // so a subscriber can watch it from the start).
  for (const box of ['inbox', 'outbox']) {
    if (!layers[box]) continue
    const folder = join(view, box)
    mkdirSync(folder, { recursive: true })
    for (const f of files(join(from, box))) copyFileSync(join(from, box, f), join(folder, f))
  }
  if (setting && work && !dir) writeFileSync(join(work, SETTING), JSON.stringify({ storage: 'filesystem', name }) + '\n')
  return { name: name ?? view.split('/').pop(), dir: view, layers }
}

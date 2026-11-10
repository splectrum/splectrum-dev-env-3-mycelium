// A repository's folder (docs/design/structure.md): <work>/mrepos/<name>/,
// its git on disk (.git), and a layer's files at the path of its URI
// (/inbox at <work>/mrepos/<name>/inbox).
//
// Which repository, on which storage (docs/design/native.md): the setting
// beside it, <work>/mrepo.json, { "storage": "git" | "filesystem" | "p2p", "name" }
// (git: native git; filesystem: the p2p-git hybrid with every layer on the
// filesystem, no Corestore, as the boot mrepo runs); without
// it, the p2p host (the host's repository, `host`, in the Corestore at
// <work>/store with its disk side). The runtime needs it before it can read
// any layer, so it is not in the repository.
import { join } from 'bare-path'
import { existsSync, readFileSync } from 'bare-fs'

export const MREPOS = 'mrepos'
export const SETTING = 'mrepo.json'
export const viewOf = (work, name) => join(work, MREPOS, name)
export const gitdirOf = (work, name) => join(viewOf(work, name), '.git')
export function setting (work) {
  const f = join(work, SETTING)
  return { storage: 'p2p', name: 'host', ...(existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}) }
}
// A folder holding a repository's runtime: a p2p host (store/) or a
// standalone repository (mrepo.json).
export const isWork = work => existsSync(join(work, 'store')) || existsSync(join(work, SETTING))

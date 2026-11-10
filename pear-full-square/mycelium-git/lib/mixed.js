// One repository over two stores (docs/design/repositories.md, "Layers by
// their writes"): its atomic and replicated layers in one backend (the
// Corestore's), its non-atomic layers in another (git on disk), routed by
// the branch's layer (isLocal). The backend contract, so everything above
// works on it unchanged.
// - Branches: each in its store; listed together.
// - Objects: written to the disk store; a commit or tree written there gets
//   what it refers to first, so the disk store holds the whole history of
//   what it has; read from whichever store has them.
// - An atomic branch moved: its commit's objects transferred into the
//   atomic store first (the same ids; those it has skipped), then its ref.
// - History and merges: computed on the disk store, the commits brought in.
import { transfer } from './transfer.js'

// The layers stored on disk, not atomic: request/*, the boxes (inbox,
// outbox) and execute/* (the execution branches).
export const isLocal = name => ['request', 'inbox', 'outbox', 'execute'].includes(name.split('/')[0])

export function mixedBackend ({ atomic, local, isLocal: routed = isLocal }) {
  const has = (b, oid) => b.hasObject(oid)
  // An object and all it reaches, on disk.
  const here = async oid => { if (!await has(local, oid)) await transfer(atomic, local, oid) }
  const from = async oid => (await has(local, oid)) ? local : atomic
  const storeOf = name => routed(name) ? local : atomic

  return {
    async init () {
      await local.init()
    },

    async listBranches () {
      const a = (await atomic.listBranches()).filter(([n]) => !routed(n))
      const l = (await local.listBranches()).filter(([n]) => routed(n))
      return [...a, ...l].sort(([x], [y]) => x < y ? -1 : x > y ? 1 : 0)
    },

    readCommit: async oid => (await from(oid)).readCommit(oid),
    readTree: async oid => (await from(oid)).readTree(oid),
    readBlob: async oid => (await from(oid)).readBlob(oid),
    readObject: async oid => (await from(oid)).readObject(oid),
    hasObject: async oid => (await has(local, oid)) || has(atomic, oid),

    writeObject: (type, bytes) => local.writeObject(type, bytes),
    writeBlob: bytes => local.writeBlob(bytes),
    async writeTree (entries) {
      for (const e of entries) if (e.type !== 'commit') await here(e.oid)
      return local.writeTree(entries)
    },
    async writeCommit (commit) {
      for (const oid of [commit.tree, ...commit.parents]) await here(oid)
      return local.writeCommit(commit)
    },

    async updateBranch (name, oid, expected) {
      if (routed(name)) await here(oid)
      else await transfer(local, atomic, oid)
      return storeOf(name).updateBranch(name, oid, expected)
    },
    deleteBranch: (name, expected) => storeOf(name).deleteBranch(name, expected),

    async mergeBase (a, b) { await here(a); await here(b); return local.mergeBase(a, b) },
    async isAncestor (a, b) { await here(a); await here(b); return local.isAncestor(a, b) },
    async mergeTrees (ours, theirs) { await here(ours); await here(theirs); return local.mergeTrees(ours, theirs) }
  }
}

// isomorphic-git backend: the backend contract on isomorphic-git, over a
// filesystem (node's fs by default). For compatibility: the same repository,
// read and written by an engine that also runs where native git does not.
// isoStyleBackend serves any engine with isomorphic-git's API (p2p-git).

import nodeFs from 'bare-fs'
import isogit from 'isomorphic-git'

export function isogitBackend (gitdir, { fs = nodeFs } = {}) {
  return isoStyleBackend(isogit, gitdir, { fs })
}

export function isoStyleBackend (git, gitdir, { fs = nodeFs } = {}) {
  const at = { fs, gitdir }
  const seconds = time => Math.floor((time ? new Date(time) : new Date()).getTime() / 1000)

  return {
    // A new repository: bare, with main as its default branch.
    async init () {
      await git.init({ ...at, bare: true, defaultBranch: 'main' })
    },

    // --- Reading ---

    // A branch listed while another process is writing its ref (written in
    // place by the engine: for an instant unreadable) is resolved again,
    // briefly; still not there, it was deleted meanwhile: not listed.
    // The engine lists nothing when its walk of the refs is disturbed (a
    // branch removed by another process meanwhile: a request branch, made
    // and removed with every request): an empty listing is asked for again,
    // briefly; a repository with no branch at all is rare (a new one).
    async listBranches () {
      let names = []
      for (let i = 0; i < 10 && !names.length; i++) {
        if (i) await new Promise(resolve => setTimeout(resolve, 5))
        names = (await git.listBranches(at)).sort()
      }
      const resolved = async n => {
        for (let i = 0; ; i++) {
          try { return await git.resolveRef({ ...at, ref: `refs/heads/${n}` }) } catch (err) {
            if (i >= 40) return null
            await new Promise(resolve => setTimeout(resolve, 5))
          }
        }
      }
      return (await Promise.all(names.map(async n => [n, await resolved(n)]))).filter(([, oid]) => oid)
    },

    async readCommit (oid) {
      const { commit } = await git.readCommit({ ...at, oid })
      return { tree: commit.tree, parents: commit.parent, message: commit.message }
    },

    // A tree's entries in git's order, as native git gives them (a folder's
    // name compared as if it ended in '/'); isomorphic-git sorts by plain
    // name.
    async readTree (oid) {
      const { tree } = await git.readTree({ ...at, oid })
      return tree.map(e => ({ name: e.path, mode: e.mode, type: e.type, oid: e.oid })).sort(gitOrder)
    },

    async readBlob (oid) {
      return Buffer.from((await git.readBlob({ ...at, oid })).blob)
    },

    // Raw objects, for copying between repositories: { type, object }.
    async readObject (oid) {
      const { type, object } = await git.readObject({ ...at, oid, format: 'content' })
      return { type, object: Buffer.from(object) }
    },

    async hasObject (oid) {
      try { await git.readObject({ ...at, oid, format: 'deflated' }); return true } catch { return false }
    },

    // --- Writing ---

    async writeObject (type, bytes) {
      return git.writeObject({ ...at, type, object: Buffer.from(bytes), format: 'content' })
    },

    async writeBlob (bytes) {
      return git.writeBlob({ ...at, blob: Buffer.from(bytes) })
    },

    async writeTree (entries) {
      return git.writeTree({ ...at, tree: entries.map(e => ({ mode: e.mode, path: e.name, oid: e.oid, type: e.type })) })
    },

    async writeCommit ({ tree, parents, message, author, time }) {
      const who = { name: author.name, email: author.email, timestamp: seconds(time), timezoneOffset: 0 }
      return git.writeCommit({ ...at, commit: { tree, parent: parents, author: who, committer: who, message } })
    },

    // Compare-and-swap. isomorphic-git has no atomic compare-and-swap, so
    // this compares, then writes: safe against a stale change, not against
    // a writer racing in between.
    async updateBranch (name, oid, expected) {
      const ref = `refs/heads/${name}`
      let current = null
      try { current = await git.resolveRef({ ...at, ref }) } catch {}
      if (current !== (expected || null)) {
        throw new Error(`git update-ref: ${ref} is at ${current}, expected ${expected}`)
      }
      await git.writeRef({ ...at, ref, value: oid, force: true })
    },

    // Compare, then delete: as updateBranch, no atomic compare-and-swap.
    async deleteBranch (name, expected) {
      const ref = `refs/heads/${name}`
      const current = await git.resolveRef({ ...at, ref })
      if (current !== expected) throw new Error(`git update-ref: ${ref} is at ${current}, expected ${expected}`)
      await git.deleteRef({ ...at, ref })
    },

    // --- History and merge ---

    async mergeBase (a, b) {
      const [base] = await git.findMergeBase({ ...at, oids: [a, b] })
      return base || null
    },

    async isAncestor (a, b) {
      return a === b || git.isDescendent({ ...at, oid: b, ancestor: a, depth: -1 })
    },

    // isomorphic-git stores a merged tree only with a real merge, so this
    // merges without moving any branch and takes the tree. The merge commit
    // it makes is never referenced (the writer makes its own); git's garbage
    // collection removes it.
    async mergeTrees (ours, theirs) {
      try {
        const r = await git.merge({
          ...at, ours, theirs, noUpdateBranch: true, abortOnConflict: true,
          author: { name: 'merge', email: 'merge@localhost' }
        })
        return { tree: r.tree || (await git.readCommit({ ...at, oid: r.oid })).commit.tree, conflicts: [] }
      } catch (err) {
        if (err.code === 'MergeConflictError') return { tree: null, conflicts: err.data.filepaths }
        throw err
      }
    }
  }
}

const sortKey = e => Buffer.from(e.type === 'tree' ? `${e.name}/` : e.name)
function gitOrder (a, b) {
  return Buffer.compare(sortKey(a), sortKey(b))
}

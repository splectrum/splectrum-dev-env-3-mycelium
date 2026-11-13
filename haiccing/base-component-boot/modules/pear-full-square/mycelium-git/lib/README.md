# lib/

The parts of mycelium-git, a file each, imported by its `index.js`.

| file | |
|---|---|
| `bundle.js` | Bundles: a repository's branches packed into one file, on the backend contract, so on every engine. |
| `isogit.js` | isomorphic-git backend: the backend contract on isomorphic-git, over a filesystem (node's fs by default). |
| `mixed.js` | One repository over two stores: its atomic and replicated layers in one backend (the Corestore's), its non-atomic layers in another (git on disk), routed by the branch's layer (isLocal). |
| `native.js` | Native git backend: the reference. |
| `p2pgit.js` | p2p-git backend: the backend contract on p2p-git, the embedded engine (isomorphic-git stripped to plumbing: loose objects only, no working tree, pluggable fs, for Bare with bare-fs or Hyperdrive). |
| `repo.js` | A repository as one tree, for mycelium-xpath. |
| `split.js` | Splitting a folder out of a branch's history, as git subtree split does, on the backend contract, so on every engine: each commit whose folder changed becomes a commit of the folder alone, with the original author, committer and message. |
| `transfer.js` | Copying objects between repositories: everything a commit reaches, from one backend into another, whatever their engines. |
| `write.js` | Writing under the rules: a change is a set of puts and removes on one branch, committed as one checkpoint; a merge is a plain merge; branches are created and deleted only as the rules allow. |

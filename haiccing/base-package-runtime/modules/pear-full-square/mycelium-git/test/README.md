# test/

## `bundle.test.js`

Bundles against native git: ours verify and clone with native git, and native bundles (with delta-compressed objects) read into every engine.

- writeBundle: native git verifies, clones and fscks it, on every engine
- readBundle: a native bundle with deltas, into every engine
- readBundle: a corrupted bundle and missing prerequisites are refused

## `contract.js` (shared, not a test)

The contract suite: the same tests, run against every backend (by `native.test.js`, `isogit.test.js`, `p2pgit.test.js`, `hyperdrive.test.js`, and p2p-mrepo's `contract.test.js`), each named with its engine:

- above the branches: name segments
- into a branch
- read
- pinned: a repository at a recorded state
- change: put and remove, one commit
- a tree's entries come in git's order
- change: emptied folders disappear
- change: conflicts and missing paths throw
- change: a concurrent change fails, nothing is overwritten
- merge: plain merge commit, nothing to do when merged
- merge: fast-forward only when asked
- merge: disjoint layers are never merged
- createLayer: orphans under layer segments, leaves only
- createExecution and deleteBranch: only once merged
- commitTree: a checkpoint replacing the whole tree
- init: a new, empty, bare repository
- raw objects: read, write, has
- importLayer: new under the layer rules, existing only forward
- merge: conflicts throw

## `engines.test.js`

Compatibility: the same writes give the same objects on every engine, so a repository written by one is the same repository for the other.

- native, isomorphic-git and p2p-git: same writes, same oids and outcomes
- transfer and importLayer between every pair of engines

## `fixture.sh` (shared, not a test)

Build the test repository: fixed authors and dates, so its oids are stable.

## `hyperdrive.test.js`

The contract suite on p2p-git with a Hyperdrive as its filesystem, through p2p-git's own adapter (hyperdrive-fs.js): the fixture copied into a drive (on a Corestore of its own), then the same tests as on every other engine.

## `isogit.test.js`

The contract suite (`contract.js`) on isomorphic-git.

## `mixed.test.js`

- isLocal: the request layers, the boxes and the execution branches on disk, the rest atomic
- mixed: each branch in its store; an atomic branch complete in its own store; merges across

## `native.test.js`

The contract suite (`contract.js`) on native git.

## `p2pgit.test.js`

The contract suite (`contract.js`) on p2p-git.

## `split.test.js`

split against native git subtree split, the reference, on a history with a folder changed on both sides of a merge and commits that don't touch it.

- split: the same commits as git subtree split, on every engine

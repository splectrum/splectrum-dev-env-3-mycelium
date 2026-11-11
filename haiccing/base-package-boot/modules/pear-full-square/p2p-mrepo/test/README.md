# test/

p2p-mrepo's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/p2p-mrepo`.

## `contract.test.js`

mycelium-git's contract suite on a repository on the p2p layer: the fixture imported into a p2p-mrepo repository, then the same tests as on every other engine (mycelium-git's `test/contract.js`).

## `local.test.js`

A repository with its disk side (local): its atomic layers in the store, its non-atomic ones (request/*, execute/*) in `<local>/<name>/.git`, opened again with both.

- local: the non-atomic layers on disk, in the repository's folder

## `mrepo.test.js`

- create, write through mycelium, reopen on start: the same repository
- import from the boundary: a native repository and a bundle, the same commits
- clone: the same history under a new key and id, its origin recorded
- a replica by key: read through mycelium, lazily, read only
- events: names, ids and keys, never a secret

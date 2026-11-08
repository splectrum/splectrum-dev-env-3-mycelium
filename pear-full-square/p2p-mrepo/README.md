# p2p-mrepo

Mycelium repositories on the p2p layer. Each repository is a drive in a
`p2p-store`, with p2p-git on it, and is given to its users as a mycelium
backend (mycelium-git's backend contract): mycelium works with it and
knows nothing of p2p. Part of the p2p series.

```js
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
const repos = mrepos({ store: await openStore({ storage, primaryKey }), observer })
const repo = await repos.create('notes')                   // { name, id, key, drive, backend }
await repos.import('dev', { native: '/path/repo.git' })    // or { bundle: bytes }
await repos.clone(repo, 'notes-copy')                      // a new key and id, its origin recorded
await repos.open('notes')                                  // the store's own, again (on start)
const replica = await repos.replica(key)                   // another's, read only, lazily
await repos.list()
openRepo(repo.backend).read('/main/readme.md')             // mycelium, unchanged
```

- **Identity.** A repository's key is its drive's; its internal id (a GUID)
  and origin are recorded inside it (`/mrepo.json`, next to the git
  directory at the drive's root), so any copy says what it is.
- **The store's own repositories** are listed in a registry (a drive of the
  store's own, `mrepo-registry`), so they are opened again on start. A
  repository already open is given again: a drive's db core is an
  exclusive session.
- **Names** are URI segments: lowercase `a-z`, `0-9`, `-`.
- **mycelium-git** is a sibling folder (`../mycelium-git`), as the mycelium
  modules are to each other; p2p-git comes from `pear-full-square/p2p-git`.

## From the command line

`engine.js` is an engine for mycelium-git's CLI: every mycelium operation
runs on a p2p-mrepo repository (`repo`, in the store at the path given):

```sh
node ../mycelium-git/cli.js --engine=../p2p-mrepo/engine.js select <storage> /main/*
node cli.js import <storage> <native-repo>     # the boundary in
node cli.js export <storage> <bundle>          # the boundary out
```

**Instrumentation** (the series' contract): `repo-created`,
`repo-imported`, `repo-cloned`, `repo-opened`, `replica-opened`: names,
ids, keys and counts, never a secret.

## Tests

- `npm test`: create, reopen, import (native and bundle), clone, a replica
  read lazily, events without secrets; and mycelium-git's contract suite
  on a p2p-mrepo repository (23 tests).

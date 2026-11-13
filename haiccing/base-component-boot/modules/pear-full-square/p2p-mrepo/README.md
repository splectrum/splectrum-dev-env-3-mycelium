# p2p-mrepo

Mycelium repositories on the p2p layer: each a drive in a `p2p-store`, given
to its users as a mycelium backend.

Mycelium works with these repositories and knows nothing of p2p. A
repository is created, imported, cloned or opened on a store; part of the
p2p series.

| | |
|---|---|
| [test/](test/) | its tests, what each checks |

## Usage

```js
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
const repos = mrepos({ store: await openStore({ storage, primaryKey }), observer, local })
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
- **A disk side, with `local`** (a folder): each repository opened over two
  stores (mycelium-git's `mixedBackend`): its atomic layers in its drive,
  its non-atomic layers (`request/*`, `execute/*`) in git on disk at
  `<local>/<name>/.git` (p2p-git on `bare-fs`, made the first time).
  Without `local`, everything in the drive. A replica is the drive's only.
- **Names** are URI segments: lowercase `a-z`, `0-9`, `-`.
- **mycelium-git** is a sibling folder (`../mycelium-git`), as the mycelium
  modules are to each other; p2p-git comes from `pear-full-square/p2p-git`.

**Instrumentation** (the series' contract): `repo-created`,
`repo-imported`, `repo-cloned`, `repo-opened`, `replica-opened`: names,
ids, keys and counts, never a secret.

## Tests

- `npm test`: create, reopen, import (native and bundle), clone, a replica
  read lazily, events without secrets; and mycelium-git's contract suite
  on a p2p-mrepo repository (23 tests); a repository with its disk side
  (`test/local.test.js`).

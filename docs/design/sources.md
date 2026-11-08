# Sources, contents, air-gapping

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## Where packages come from

**Built** (today): `haiccing/sources` lists where haiccing's repositories
come from, in order, the first that has one wins:

```
folder <path>     a folder of repositories side by side (plain copies)
github <org>      GitHub's archives of main (curl and tar; a lost connection tried again)
```

The setup writes it (`--sources=folder:<path>`, `--sources=github:<org>`;
default `github haiccing`). A repository already in `haiccing/` is kept as
it is; `./haicc fetch <repository>` fetches one.

**Agreed** (next):

```
# <root>/sources: one line per package, or * for the rest; the first that matches wins
base-package-haicc  folder /home/you/repos/haiccing             the files as they are: development
base-package-p2p    git    /home/you/repos/haiccing feature-x   committed, a local clone (default main)
*                   github haiccing                              committed, GitHub (default main)
```

- **`folder`**: any folder, as it is, uncommitted changes included (test
  before committing). **`git`**: a ref of a local clone: the same content
  as GitHub, without the network. **`github`**: a ref, default `main`.
- **Mix and match**, per package (development); what is mixed is said.
- **Each root has its sources**: `haiccing/` (haiccing's packages only),
  `user/` (the user's own).

## What the sources hold

**Built** (the human, 2026-11-07): `./haicc sources` (`fetch.sh --list`),
the manifest `haiccing/sources.json`. The sources can be listed: what each
holds (a `folder`: its package folders; `github`: the organisation's
repositories, through GitHub's API with `curl`; a `git` source: its
clones), into a manifest of the full content of the sources. The root's
boot refreshes the platform's two packages from them (`design/platform.md`).

## Contents: each packages folder describes itself

**Built** for a master's repository (`contents.json`: the package it was
assembled from, its hash, the swarm, the modules, when). **Agreed** for
every packages folder (`haiccing/`, `user/`, the root's `packages/`): each
package, its source, commit, uncommitted or not, hash, when; a hash that no
longer matches said as changed. `swarms.json` keeps, per swarm, what it was
made from, fully qualified.

## Air-gapping

- **Built**: the setup is one file carrying everything (the platform's
  package and Bare's runtime); the boot downloads nothing; with a `folder`
  source, nothing comes from a network.
- **Agreed**: `git` sources from local clones; the node containers' base
  image from a local file (`docker load`), with the containers' step.

*Why*: the platform must be installable and testable on a machine with no
network, from files carried to it.

# A mycelium repository on native git

Status marks: **built**, **agreed**, **open**. Agreed with the human,
2026-11-10, in `dev-env-3-mycelium` (phase 3, step 2).

## What it is

**Agreed.** The mrepo framework (`repositories.md`, "A running repository")
running standalone on an ordinary git repository: every layer on the
filesystem, read and written through `mycelium-git`'s native backend (git
itself; git 2.38 or newer for its merges); requests submitted to its inbox,
as on the p2p layer. The same runtime, protocols, records, boxes, API and
bundles: only how the repository is opened differs.

- **The storage, a setting beside the repository**: the runtime needs it
  before it can read a layer, so it is not in the repository: a file in the
  repository's folder (`mrepo.json`: `{ "storage": "git" }`, or `"p2p"`).
  The runtime opens the repository by it: `git`, the native backend on the
  repository's git directory; `p2p`, the hybrid over a Corestore and git
  on disk (as the host). One runtime package; the p2p opener loaded only
  on p2p.
- **The repository's folder holds its boxes** (`inbox/`, `outbox/`), its
  `packages/` (the bundles copied out, as Bare runs them), the runtime's log
  and local connection; its folder a parameter, not the host's fixed
  `<work>/mrepos/host/`.
- **A bare repository**: no working tree to go stale when the runtime moves
  `main`; read by git or by a `get` request.
- **A boot for a git repository**: its layers created, `/runtime/service.json`
  booted (its type, its package), the first bundles committed into
  `packages` (built by the package writer, or taken from a release),
  preloaded with `service initialise /`.
- **Sync is a push**, outside the requests (as replication or export on
  p2p): `git push origin --all`, every layer, at checkpoints; one runtime
  writing at a time, a session taking over by cloning, handing back by
  pushing.

## The development pipeline

**Agreed** (the direction; the detail with the human as it is built).
`main` holds the source this repository develops; `packages` the bundles it
runs. A request changes the source; new bundles are built from it (the
package writer: later a request of the pipeline itself) and committed into
`packages` with a new manifest; `service initialise` moves the repository
onto them. Code never runs from `main`.

*Why*: the development pipeline an AI runs autonomously on the p2p layer,
built and proven on native git first, in a cloud session; the same
framework both ways.

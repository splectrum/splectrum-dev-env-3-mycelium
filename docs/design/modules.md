# The modules: who does what

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle). Decided with the human in phase 3 (from
2026-11-08, step 1's review, `steps/1-review/findings.md`; the `mrepo-`
modules 2026-11-09 and 10). In development a concern is
one single-concern module, used by the modules that need it; the package
writer copies it into every package that needs it (`rules.md`, "One
concern, one place" and "Shared in development, copied into packages").

## Removed

**Built** (step 1, `steps/1-review/2-removal/`, `3-clis/`): phase 2's first
platform (the root `haicc` launcher, `p2p-swarm-manager`, `haicc-reconcile`,
`haicc-deployment`'s project layer, `test-run/` and its command files,
`mycelium-repo`) and the command lines nothing called (`mycelium-git`,
`-layer`, `-uri`, `-xpath`, `p2p-mrepo`): what they did, when needed, is
rewritten, HAICC-wrapped.

## New modules

**Agreed** (their product repositories created by the human; the `mrepo-`
ones named, renamed or created, 2026-11-09), all in `pear-full-square`:

| Module | Concern | Replaces |
|---|---|---|
| `docker-manager` | Docker for the platform: the call, networks (with a subnet; addresses), the node image, hardened containers (run, stop, remove, pause, inspect, logs as JSON lines) | four Docker wrappers (`haicc-base-boot`, `haicc-deployment`, `p2p-node-manager`, Splectral's p2p side), the hardening flags twice |
| `haicc-cli-parser` | a command line parsed once (flags and arguments, values kept whole), for the inputs that read one: HAICC's terminal input (`haicc-base-cli` parses its own for now: moved here when a second input needs it) and the transitional tools until HAICC replaces them | eight parsers in three variants |
| `p2p-observe` | the p2p series' instrumentation: the observer call and its helpers | the emitter and `hex` in eight p2p modules |
| `mycelium-value`, `-value-json`, `-container-document`, `-container-lines` | values, an encoding, storage containers (`values.md`; `-value-json` and `-container-document` **built**) | JSON in five places, JSON lines in three |
| `mycelium-container-bundle` | a bundle as a read-only container of files (`values.md`); its product repository to be created by the human | (new: assets and data files read from bundles) |
| `mrepo-base-runtime` (**built**; first `mycelium-repo-main`) | a running repository's runtime: the framework running its protocols by one poller; the store held as its single writer; the local connection; started detached, ended once shut down (`repositories.md`, "A running repository") | (new: the running repository) |
| `mrepo-base-request` (**built**; was `mycelium-request-submit`) | the request protocol: the inbox taken in and checked, the queue, the moves between request layers, the answers; and the records, the boxes, the local dispatcher | `mycelium-layer`'s intake and `p2p-node`'s copy (which takes a peer's names unchecked) |
| `mrepo-base-execute` (**built**; was `mycelium-request-execute`) | the execute protocol: a request run in execution branches made from their targets, its record, the merges back; the framework's generic actions (`rest`, `service`) | `mycelium-layer`'s `executeRequests` |
| `mrepo-base-log` | the log protocol | (new) |

Built in existing modules this phase: `mycelium-git`'s `mixedBackend` (one
repository over two stores) and the `runtime` layer; `p2p-mrepo`'s `local`
(a repository's disk side); `haicc-base-boot` rebuilt (the boot of the host's
repository); `haicc-base-cli` (HAICC's terminal input: every command a
request).

`mycelium-layer` keeps the branches (import, export, bundles, deploy,
extract). The request queue (`plan` today) waits for the request manager:
several source types, a source being a layer of another repository
(`repositories.md`). Recording a unit for an exact rerun may become a
concern of its own, shared with the development pipeline (**open**).

## Moved, or kept apart

**Agreed.**

- **Fetching from the sources is the package manager's**: `fetch.sh`
  (fetch, list, refresh) moves from `haicc-base-boot` into
  `pkgm-base-manager`, in shell (downloads stay in the shell); with
  packages as bundles, it fetches releases into the host's store
  (`structure.md`).
- **HAICC carries the package manager's code it needs** (changed
  2026-11-09, with packages as bundles: `structure.md`, "Bundles disjoint"):
  copied into HAICC's bundle by the package writer, the package manager's
  own release a bundle of its own; no lookup beside it, `lib/pkgm.js` goes.
  (Decided first, 2026-11-08: HAICC using the `base-package-pkgm` beside
  `base-package-haicc` at its one fixed place, the development path going.)
- **The log writer** (`lib/log.js`, and the shell's): left until the logs are
  a mycelium repository.
- **Names**: the boot cleans a new name (lowercase, every run of other
  characters a `-`, the change said); `mycelium-uri` validates at the
  boundary; two concerns, not one twice (`docs/rules.md` 1). The branch-name
  helper of the `mycelium-git` and `mycelium-layer` command lines moves into
  `mycelium-uri`.
- **The git engine** is handed in by the storage's owner
  (`repositories.md`).
- **Splectral's p2p side asks the owners**: Docker through `docker-manager`,
  the swarm's nodes through HAICC, the node manager's topic layout from
  `p2p-node-manager`.
- **Command lines**: only HAICC takes commands from a person; the internal
  command lines (`p2p-node`, `splectral-server`, `p2p-node-manager`,
  `pkgm-base-manager`) get their arguments from our own code and keep their
  plain parsing, values kept whole.

## Wrapped in HAICC

**Agreed.** HAICC in the container (the node's program started through the
node's HAICC); Splectral wrapped in HAICC (its server and `act`); the boots
(the service protocol's `boot`): the initial one (the setup, or the Pear
release: `structure.md`) uses the module directly (**built**), every other
is a request to a repository's HAICC; the shell commands (the modules' scripts, the booted tests, the
setup) analysed and wrapped. A shell script is glue (`docs/rules.md` 30).

## Splectral, done properly

**Agreed** (it was plumbed in for the demos only): `p2p-node` knows no
Splectral and no manager; it offers one general way to attach an
application to a running node (the node and its input handed to it), naming
none; what is attached comes from the node's configuration, started through
the node's HAICC; the observer and the manager's state attach themselves
(today `p2p-node/cli.js` imports the observer under `--observer=true` and
reads the manager's shadow from stdin; the node's own repository replaces
the shadow: `repositories.md`).

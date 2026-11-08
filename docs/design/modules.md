# The modules: who does what

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle). Decided with the human, 2026-11-08 (phase 3,
step 1's review, `steps/1-review/findings.md`). In development a concern is
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

**Agreed** (their product repositories created by the human), all in
`pear-full-square`:

| Module | Concern | Replaces |
|---|---|---|
| `docker-manager` | Docker for the platform: the call, networks (with a subnet; addresses), the node image, hardened containers (run, stop, remove, pause, inspect, logs as JSON lines) | four Docker wrappers (`haicc-base-boot`, `haicc-deployment`, `p2p-node-manager`, Splectral's p2p side), the hardening flags twice |
| `haicc-cli-parser` | HAICC's command lines: flags and arguments parsed once, values kept whole (for the transitional tools too, until HAICC replaces them) | eight parsers in three variants |
| `p2p-observe` | the p2p series' instrumentation: the observer call and its helpers | the emitter and `hex` in eight p2p modules |
| `mycelium-value`, `-value-json`, `-container-document`, `-container-lines` | values, an encoding, storage containers (`values.md`) | JSON in five places, JSON lines in three |
| `mycelium-request-submit` | a request from a source placed into the requests, once, one function per source type, each validated where it enters (a folder; a peer's bundle) | `mycelium-layer`'s intake and `p2p-node`'s copy (which takes a peer's names unchecked) |
| `mycelium-request-execute` | executing requests and their response, one unit, recorded for an exact rerun | `mycelium-layer`'s `executeRequests` |

`mycelium-layer` keeps the branches (import, export, bundles, deploy,
extract). The request queue (`plan` today) waits for the request manager:
several source types, a source being a layer of another repository
(`repositories.md`). Recording a unit for an exact rerun may become a
concern of its own, shared with the development pipeline (**open**).

## Moved, or kept apart

**Agreed.**

- **Fetching from the sources is the package manager's**: `fetch.sh`
  (fetch, list, refresh) moves from `haicc-base-boot` into
  `pkgm-base-manager`, in shell (downloads stay in the shell). The setup's
  package manager carries it, since the bootstrap's refresh goes through it.
- **HAICC uses the package manager at its one fixed place**: the
  `base-package-pkgm` beside `base-package-haicc`, which every cold boot
  copies in (the pair); the development path in `lib/pkgm.js` goes, the
  tests set the pair up as a work folder has it.
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
node's HAICC); Splectral wrapped in HAICC (its server and `act`); the cold
boots: the initial one (the setup's `./boot`, or the Pear release:
`structure.md`) may use the module directly, every other is wrapped in
HAICC; the shell commands (the modules' scripts, the booted tests, the
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

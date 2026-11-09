# Phase 3: plan

The phase's request: `pending/phase-3/request.md` on `pending/default`.
Planned here as the work goes (the request: "the work is planned here, as
it goes"); each step a request of its own, its record in `steps/<step>/`.

## Steps

| Step | What | Status |
|---|---|---|
| 0 | The setup: the seed planted, the development state from phase 2 (`0-setup/`) | done |
| 1 | The review of phase 2's code, and the refactor (`1-review/`) | the review discussed with the human, decisions in `1-review/findings.md` and `docs/design/`; the dead layer and the unused CLIs removed; the fixes and new modules next |
| 2 | The documentation: the stale notes cleaned up, the documentation split into clear sections | to come |
| 3 | Mycelium repositories on a swarm: data hives, mounting, a repository for the logs | to come, designed with the human step by step; needed everywhere (the human): every level's config and state in its own repository, the node's first; the branch model for portable execution at its core |

## The design decided in step 1's review

Decided with the human, 2026-11-08; in `docs/design/` (a decision lives
once), each marked built, agreed, open or to probe:

- `docs/design/repositories.md`: the repository the truth, a working tree a
  view at the boundary; the git engine handed in by the storage's owner;
  the branch model (one writer per branch; passive and active
  repositories; the request branches `request/pending`, `-executing`,
  `-done`; a packages layer of links instead of capability); portable
  execution triggered by data; near real time (RPC as the signal,
  replication as the record); the node's own repository.
- `docs/design/structure.md`: every level set up as a node is (HAICC a
  wrapper, converging into one; what is provided, not where; a capability
  from elsewhere, such as Docker by the host's proxy); a level's folder;
  code without a code folder (bundles, native addons); Pear as a substrate below HAICC, only triggering the cold
  boot into a HAICC bridgehead; Pear's model and ours for upgrades.
- `docs/design/values.md`: the data type, encodings and containers as
  modules; formats on Bare; compact-encoding the envelope, AVRO the
  content; RPC on the replication connection.
- `docs/design/modules.md`: what was removed; the new modules; what moves
  where; what is wrapped in HAICC; Splectral done properly.

## The implementation

In order; each part a request on `pending/default`, executed on
`execute/main`, recorded in `steps/<step>/`, every package's full set passing
from a fresh release (Node.js off the PATH) before it is merged into `main`;
then the changed modules split into their product repositories (a new
module's first merge joining its repository's LICENSE, as in phase 2).
Pushes kept few: one per part, not per change. The detail of each part is
designed with the human when it starts.

### Step 1, part 4: the fixes (on the code as it is)

The review's mechanical findings (`1-review/findings.md`, sections 4 to 8),
the platform kept green:

- **Bugs**: the other-host demo's cross-host request (`channel closed`, a
  stale channel kept; its teardown leaving host B's container);
  `mycelium-topic`'s `follow` (an unhandled rejection); `fetch.sh
  --refresh` deleting a package when its copy fails; the stale pid in
  Splectral's stop; `base-view-map`'s incoming links (`to` against
  `toKey`); `splectral-model`'s `restore` (merging, not replacing); the
  committed offset (Kafka's meaning in both places); `p2p-connect`'s
  growing `closed` list.
- **Rules**: the hidden temporary file (`mycelium-topic`, rule 2); the
  two `fetch.sh` calls dropping stderr (rule 7); the tests' temporary folders
  left behind (rule 21); in-place tests' `needs` (rule 22); booted tests
  without a time limit (rule 24); `tests_` (`_` reserved).
- **Boundaries** (`rules.md`: validated once where input enters, the happy
  path inside): the checks inside removed (`p2p-rns`, `pkgm`'s `assemble`);
  validation where it is missing (the observer's `write` name, the
  invitation's fields and keys, `p2p-rns`'s handler); names (`docs/rules.md`
  1: a new name cleaned, an existing one exact; the package name in `boot
  <package>/test`).
- **Documentation against the code**: the READMEs and design statuses the
  review listed.
- **Tests missing**: `splectral-replay`, `splectral-p2p-actions`' untested
  actions, `p2p-node-manager`'s `manageNode`, `splectral-model`'s
  `restore` (the browser side waits for the Splectral rework).

### Step 1, part 5: the single-concern modules

`docs/design/modules.md`: each new module made from the code it replaces
(no new behaviour), its users switched, tested; its product repository
(created by the human) getting its first merge:

1. `p2p-observe` (the p2p modules' emitter); `mycelium-git`'s engine handed
   in (the `p2p-git` and `isomorphic-git` wrappers out, the Hyperdrive test
   to `p2p-mrepo`).
2. `mycelium-value`, `-value-json`, `-container-document`,
   `-container-lines`, `-container-bundle` (`values.md`; the data names
   moved from `mycelium-uri`).
3. `docker-manager` (four Docker wrappers; the node image question, rule
   27, settled here).
4. `haicc-cli-parser` (the terminal's boundary; `--verbose` and `--debug`
   built or dropped here).
5. `mycelium-request-submit`, `mycelium-request-execute` (out of
   `mycelium-layer`; `p2p-node`'s intake copy replaced).
6. Fetching from the sources moved into `pkgm-base-manager`.

### Step 1, part 6: the probe

`docs/design/structure.md`: a real package's closure as a bundle
(`p2p-node`'s: it runs, its size, its addons, its module types;
`closure.js` against `bare-module-traverse`); native addons; a long-lived
read-only reader of a store. Recorded; a point that shows the design wrong
discussed with the human before part 7.

### Step 1, part 7: packages as bundles, published as releases

`docs/design/structure.md`: the package writer making a bundle per entry
point (declared in `packages.json`; the tests files in the bundle, run
against it; hashes in a manifest); `tools/publish.sh` making releases (built
and published by local, with the human's word); the package manager and the
warm boot checking bundles by hash; levels fetching bundles and running
them, `addons/` by hash; Splectral's assets read from its bundle; the pair
gone (HAICC carrying the package manager's code; `lib/pkgm.js` out; rule 12's
exception and `platform.md`, `packages.md` changed). The first release with
bundles checked by local, as every release.

### Step 2: the documentation

The stale notes (`notes/`, phase 2's) cleaned up; what still holds moved
into `docs/` (design, rules, guides); the documentation split into clear
sections where it is not already; never more than the implementation.

### Step 3: mycelium repositories at every level

`docs/design/repositories.md` and `structure.md`, designed in detail when it
starts, one thin path end to end first (the node's own repository): a
level's repository and its single writer process; the packages layer as the
code store (bundles as objects; the host's and the swarm's stores);
`mycelium-xpath` browsing bundles by URI; the request branches and the
request manager per source; logs as topics; the folder translation (only
where a host process needs files); the terminal access mode (`--json`,
`read <uri>`, `commands`, `--plan`); HAICC converging (and the rename);
backups per repository, disjoint. The request's "done": a proof in
principle of an operational mycelium repository on the HAICC platform.

### When the work touches the area

Splectral done properly (`modules.md`: applications attached to a node from
its configuration; Splectral wrapped in HAICC; asking the owners; the
review's Splectral findings, `with` renamed in its action records); HAICC
in the container; the cold boots and the shell commands wrapped; the log
writer with the logs repository.

### Out of this phase's scope

The request's: triggers and internal processing requests (portable
execution's triggering; passive and active repositories, their own design),
Pear as the release, AVRO (the RPC server with it), applications on top,
private data, phones, a second physical host, the public DHT.

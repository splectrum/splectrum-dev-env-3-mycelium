# Phase 3: plan

The phase's request: `pending/phase-3/request.md` on `pending/default`.
Planned here as the work goes (the request: "the work is planned here, as
it goes"); each step a request of its own, its record in `steps/<step>/`.

## Steps

| Step | What | Status |
|---|---|---|
| 0 | The setup: the seed planted, the development state from phase 2 (`0-setup/`) | done |
| 1 | The review of phase 2's code (`1-review/`) | done: the decisions in `docs/design/` (with the human, 2026-11-08 and 09); the dead layer and the unused CLIs removed |
| 2 | The rebuild on the new design: bundles and mycelium repositories at every level, the demos on it, centralised logs and a viewer | next |
| 3 | The documentation: the stale notes cleaned up, the documentation split into clear sections | after step 2 |

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

Agreed with the human, 2026-11-09: **the code is rebuilt on the new design**
(packages as bundles, mycelium repositories at every level), the existing
code a source to take from where it fits, not converted piece by piece;
**the demos improved a bit** (centralised logs and a viewer; no major new
requirement). With the documentation cleanup, that fulfils the phase's
request:

| The request | Fulfilled by |
|---|---|
| a review of phase 2's code, and a refactor | step 1's review; step 2's rebuild |
| the documentation cleaned up, in clear sections, never more than built | step 3 |
| data structure composition by read-only references into data hives | the swarm composing its nodes' log topics by URI (the centralised logs): a read-only reference into another repository's data |
| functionality mounted on the repository, which stays self-contained | the packages layer holding the bundles: a repository carries the code it runs |
| a mycelium repository on the swarm for the logs | logs as topics, centralised by the swarm |
| maybe: the logs consumed by a Splectral server, through a browser | the log viewer in the demos |
| done: a proof in principle of an operational mycelium repository on the HAICC platform | the demos running on the rebuilt platform |

Each part a request on `pending/default`, executed on `execute/main`,
recorded in `steps/<step>/`; every package's full set from a fresh release
(Node.js off the PATH) before a merge into `main`; the changed and new
modules then split into their product repositories (a new module's first
merge joining its repository's LICENSE). Few pushes: one per part. The
detail of each part designed with the human when it starts. The new modules
(`docker-manager`, `haicc-cli-parser`, `p2p-observe`, `mycelium-value` and
its handler and containers, the request modules) are made when a part needs
them (`docs/design/modules.md`); the review's findings
(`1-review/findings.md`) applied where the rebuild touches the code.

### Step 2: the rebuild

The code rebuilt on the new design (`docs/design/`): packages as bundles,
mycelium repositories at every level, logs as topics centralised by the
swarm, the demos on it with a log viewer. Collaborative: the work decided
with the human as it moves along.

### Step 3: the documentation

The stale notes (`notes/`, phase 2's) cleaned up; what still holds moved
into `docs/` (design, rules, guides); `rules.md` changed where the rebuild
changed it (the reserved segments `request` and `packages`, "a leaf is an
object", rule 12's exception gone); the documentation in clear sections,
never more than built.

### Later, not required by this phase

Splectral done properly beyond the viewer (`modules.md`); the request
branches and the request manager per source (`repositories.md`); the full
terminal mode (`commands`, `--plan`, changes as requests); HAICC's
convergence and the rename; backups per repository; the log writer's place.

### Out of this phase's scope

The request's: triggers and internal processing requests (portable
execution's triggering; passive and active repositories, their own design),
Pear as the release, AVRO (the RPC server with it), applications on top,
private data, phones, a second physical host, the public DHT.

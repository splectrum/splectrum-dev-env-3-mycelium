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
  code without a code folder (a mycelium protocol for Bare, `bare-bundle`,
  native addons); Pear as a substrate below HAICC, only triggering the cold
  boot into a HAICC bridgehead; Pear's model and ours for upgrades.
- `docs/design/values.md`: the data type, encodings and containers as
  modules; formats on Bare; compact-encoding the envelope, AVRO the
  content; RPC on the replication connection.
- `docs/design/modules.md`: what was removed; the new modules; what moves
  where; what is wrapped in HAICC; Splectral done properly.

## Work to come

- **Step 1, the implementation**: the new modules and the moves
  (`docs/design/modules.md`); the mechanical fixes (`1-review/findings.md`,
  sections 4 to 8); the full sets from a fresh release after each group.
- **The probe** (`docs/design/structure.md`): a mycelium protocol loading a
  package from a commit's tree on Bare; the same as a `bare-bundle`; native
  addons. With it, Pear's model verified.
- **Step 3, mycelium repositories** (`docs/design/repositories.md`): the
  branch model's open points first (naming another writer's layer, pinned
  or following; where the request manager runs; one writer per branch);
  the node's own repository the first user; logs as topics, how config is
  changed, the minimal file log (open, `docs/design/structure.md`).
- **When the work touches the area**, taken up with the human and the code
  there reviewed further: Splectral done properly; HAICC in the container,
  the cold boots and the shell commands wrapped; the log writer with the
  logs repository; the request manager; HAICC's convergence (and the rename
  held until then).
- **Out of this phase's scope** (the request), the structure prepared for
  it: the triggering of portable execution; Pear as the release.

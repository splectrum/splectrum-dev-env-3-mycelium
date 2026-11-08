# Step 0. The setup

Status: **done** (2026-11-08). Request: `pending/phase-3/request.md` on
`pending/default` (`72ce26b`), "First: plant this seed".

## Planted, by hand (the bootstrap)

- `main` (`83c610c`): `README.md`, `CLAUDE.md`, `rules.md`, `vision.md`,
  `docs/`, from `splectrum/roadmap-1@939eb68:seeds/dev-env-3-mycelium/`.
- `pending/default` (`72ce26b`): an orphan, the request as
  `pending/phase-3/request.md`.
- `execute/main` from `main`.

## The development state, through `execute/main` (`cdf5a00`)

From `splectrum/dev-env-2-p2p-cluster@c6b73bb`, as files (phase 2 did the
same from phase 1): the modules at their product repositories' paths
(`pear-full-square/`, `splectral/`, with the organisations' profiles, and
`bare-for-pear/` and `splectrum/` for theirs), `haiccing/`, `tools/`,
`test-run/`, `notes/`, `packages.json`, `package.json` (named
`dev-env-3-mycelium`), `package-lock.json`, the root `haicc`, `demos.md`,
`.gitignore`, and `steps/record.sh` (the recorder). Phase 2's records
(`steps/`, `test-runs/`, `cluster/`) stay there.

Changed on the way, nothing else:

- The release script, which lived in phase 2's records, is
  `tools/publish.sh` (`docs/guides/release.md` says so).
- The development repository named in the packages' READMEs (the package
  writer, `haiccing/*/README.md`), the publish commits, `demos.md` and
  `pear-full-square`'s profile: this one.
- References to phase 2's step records name its repository
  (`demos.md`, `docs/design/bare.md`).

A module's split history here is unrelated to its product repository's:
each first merge from this phase joins them (`--allow-unrelated-histories`),
as phase 2's first merges did. Nothing merged into products in this step.

## Validated

`validation/record/` (by `steps/record.sh`, rerunnable):

- `modules` (`modules.sh`): every module's own tests: 27 pass; 1 fails,
  `p2p-swarm-manager` (its tests on `node --test`, its dependencies Bare's:
  as in phase 2; it is in no package); 6 have no test script.
- `packages` (`packages.sh`): the package writer, every package's tests
  first: the five written (`haicc` `ea25d6e7c451`, `pkgm` `3981199149a8`,
  `swarm-three-nodes` `0f4494c6a0fe`, `demo-liveness` `a23e626f333d`,
  `demo-other-host` `240578faec79`).

The full sets from a fresh release (`fresh-release.sh`, Node.js off the
PATH, sources a local folder; by hand, logs not kept):

| `./haicc boot …` | full set |
|---|---|
| `base-package-haicc/test` | 6 passed |
| `base-swarm-three-nodes/test` | 17 passed |
| `base-demo-liveness/test` | 25 passed |
| `base-demo-other-host/test` | 24 of 25, 2 of 3 runs; 25 in 1 |

`base-demo-other-host`: the scenario's request across the hosts fails
with `channel closed` in 2 runs of 3 here (`splectral-p2p-actions`'
`send-request` keeps the first connection's channel and does not notice
it closing), and the run then leaves host B's container and networks
behind (the test's teardown does not stop a node the scenario started).
The code is phase 2's, unchanged; to be fixed in step 1
(`../1-review/findings.md`).

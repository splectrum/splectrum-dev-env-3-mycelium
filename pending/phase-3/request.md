# Request: third development phase

From: `splectrum/roadmap-1`, 2026-11-08, after phase 2's evaluation,
settled in discussion with the human. Numbering: the roadmap's phase 2
covers `dev-env-2-p2p-cluster`'s own "phase 2" and "phase 3"; this is the
roadmap's phase 3.

## First: plant this seed

This seed was prepared in `splectrum/roadmap-1` under
`seeds/dev-env-3-mycelium/`. Plant it by hand; this is the bootstrap.

1. Put `README.md`, `CLAUDE.md`, `rules.md`, `vision.md` and `docs/` on
   `main`.
2. Create `pending/default` as an orphan branch holding this request in
   `pending/` (as `pending/phase-3/request.md`).
3. Create `execute/main` from `main`.

Then set up the development state, through `execute/main`, from
`splectrum/dev-env-2-p2p-cluster@c6b73bb`, the code handled the same way
as there:

- the modules as folders at their product repositories' paths:
  `pear-full-square/`, `splectral/`;
- `haiccing/` (the packages' hand-written parts), `tools/`, `test-run/`,
  `packages.json`, `package.json` (named for this repository),
  `package-lock.json`, and what else the code needs to be built, tested,
  packaged and released (the root `haicc` launcher, `demos.md`);
- `notes/`, to be cleaned up in this phase (below).

Phase 2's records (`steps/`, `test-runs/`, `cluster/`) stay there, as its
data; they are not carried over.

## The aim

Full AI autonomy, from a need to running software that satisfies it
(`roadmap.md` in `splectrum/roadmap-1`). KISS, consistent rules and
self-containment make it possible; where requirements are amended, it is
to deliver better on them.

## The phase

1. **A review of the code phase 2 produced**, and a refactor where needed.
2. **The documentation with it.** The stale notes cleaned up; the
   documentation there is split into clear sections, where it is not
   already. It is never more complete than the implementation: it
   documents what was built, nothing more.
3. **Mycelium repositories on a swarm**, with initial features and
   functionality:
   - **data structure composition** by fine-grained, read-only references
     into **data hives** (a hive is a data structure);
   - **functionality mounted on the repository**, which stays
     self-contained: a crucial requirement;
   - **a mycelium repository on the swarm for the logs**;
   - maybe: the logs consumed by a Splectral server and reached through a
     browser.

How hives, references and mounting are designed is worked out in the
phase, step by step, with the human; each decision recorded once in
`docs/design/`, built or agreed.

## Done

A proof in principle of an operational mycelium repository on the HAICC
platform.

## Modules

- The code is handled the same way as in `dev-env-2-p2p-cluster`
  (`rules.md`): each module a folder on `main` at its product
  repository's path; once validated, its history is split and
  plain-merged into the product repository's `main`, never force-pushed,
  the commits linked both ways.
- Product repositories: `pear-full-square/<module>`,
  `splectral/<component>`; packages in `haiccing/<package>`, published by
  the local agent with the human's word, as in phase 2. A new repository
  is created by the human.

## Practice

- Phase 2's rules govern: `rules.md` (single concern first, records and
  topics, data names) and `docs/rules.md` (the consistency rules). They
  are proposals; practice may change them, with the human.
- Each step is a request; its execution recorded, metrics at the
  boundary, repeatable exactly.
- One thin path end to end before generalising.
- The local run is the real test: a release is checked on a local
  machine, as in phase 2.
- Planning: the request comes from `splectrum/roadmap-1`; the work is
  planned here as it goes, and its outcome is reported back there. We are
  still learning a lot.

## Not in this phase

Triggers and internal processing requests, applications on top, AVRO,
private data, phones, a second physical host, the public DHT, Pear.

## Background

- `splectrum/dev-env-2-p2p-cluster@c6b73bb`: `steps/phase-3/readme.md`
  (phase 2's last report), `notes/plan.md`, `notes/status.md`, `docs/`,
  `rules.md`, `vision.md`.
- In `splectrum/roadmap-1`: `principles.md`, `roadmap.md`, `vision.md`,
  `capabilities.md`.

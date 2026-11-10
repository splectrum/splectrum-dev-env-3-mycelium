# CLAUDE.md — dev-env-3-mrepo-native

How to work in this repository, for AI use. `rules.md` holds the rules;
`docs/design/` the design (`native.md` this repository's own).

- **The aim:** full AI autonomy, from a need to running software that
  satisfies it. KISS, consistent rules and self-containment make it
  possible. This repository is where the development pipeline an AI runs
  autonomously on p2p is built and proven, on native git.
- **Autonomy first.** Collaboration only where required — meaning, missing
  or inaccessible information, any exception that halts the work — and
  collaboration is discussion: discuss first, write what has settled.
  Structure and design are decided with the human, not alone. Natural
  language; KISS. Ask point by point, briefly.
- **The repository is worked through its requests** once it runs: a change
  is a request posted to its inbox, executed and recorded by its runtime.
  Before that (the bootstrap), by hand, as the request says.
- **Proposals, not decisions:** the rules are proposals to be tested. When
  practice shows a rule is wrong, raise it.
- **The documentation follows the implementation:** it says what was
  built, nothing more; a decision lives once, in `docs/design/`, with its
  status (built, agreed, open).
- **Execution can be repeated exactly:** every request is recorded
  (`request/done`); metrics and audit only at the boundary.
- **Few pushes**: pushing is the repository's sync, at checkpoints, never
  per request (GitHub has suspended us once for too many).
- **Planning:** the phase's requests come from `splectrum/roadmap-1`; the
  work is planned here as it goes, and its outcome reported back.

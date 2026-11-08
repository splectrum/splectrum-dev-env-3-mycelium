# CLAUDE.md — dev-env-3-mycelium

How to work in this repository, for AI use. `rules.md` holds the rules;
`docs/` the platform's design, consistency rules and guides; `vision.md`
the directions to take into account, not settled.

- **The aim:** full AI autonomy, from a need to running software that
  satisfies it. KISS, consistent rules and self-containment make it
  possible.
- **Autonomy first.** Collaboration only where required — meaning, missing
  or inaccessible information, any exception that halts the work — and
  collaboration is discussion: discuss first, write what has settled.
  Structure and design are decided with the human, not alone. Natural
  language; KISS.
- **Proposals, not decisions:** the rules are proposals to be tested. When
  practice shows a rule is wrong, raise it.
- **The documentation follows the implementation:** it says what was
  built, nothing more; a decision lives once, in `docs/design/`.
- **Execution can be repeated exactly:** record units so they can be
  rerun; metrics and audit only at the boundary.
- **Product repositories:** a session can attach other repositories and
  push to them. Keep each module's product repository updated from here,
  as `rules.md` and the request say. New repositories are created by the
  human.
- **Planning:** the phase's request comes from `splectrum/roadmap-1`; the
  work is planned here, as it goes, and its outcome reported back.
- In a Claude Code cloud session, execution runs on the session's
  `claude/…` branch until the session is told to use `execute/main`.

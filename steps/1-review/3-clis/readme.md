# Step 1, part 3: the CLIs nothing called

Status: **done** (2026-11-08), the human's word ("the CLIs are redundant,
they will be haicc wrapped from now"). Findings: `../findings.md`, decided
5.

Removed: `cli.js` of `mycelium-git`, `-layer`, `-uri`, `-xpath` and
`p2p-mrepo` (test entry points for `test-run/`'s command files), with
`p2p-mrepo`'s `engine.js` and `test/fixture.sh` (only for them), its
`./engine` export, and the READMEs' command-line sections.

## Validated

`record/`: every module's tests, 25 of 25; the package writer, the five
packages written. The full sets from a fresh release
(`../../0-setup/fresh-release.sh`, Node.js off the PATH; by hand, logs not
kept): `base-package-haicc` 5, `base-swarm-three-nodes` 17,
`base-demo-liveness` 25, `base-demo-other-host` 25 passed; nothing left
after.

# Step 1, part 2: the removal

Status: **done** (2026-11-08), with the human's yes ("remove them all; if
any of the mycelium functionality is required we can rewrite it").
Request: `b8d67a7:pending/phase-3/step-1-review/request.md`, part 2.
Findings: `../findings.md`, 1.

Removed (92 files changed, about 3,900 lines gone): the root `haicc` launcher and
`demos.md`'s sections on it; `p2p-swarm-manager`; `haicc-reconcile`;
`haicc-deployment`'s project layer (`index.js`, `cli.js`, `human.js`,
`lib/human.js`, `splectral-action.js`, `splectral.json`,
`test/deployment.test.js`); `test-run/` and the files only it read
(`test/commands*.txt`, `test/variants.js` in `mycelium-git`, `-layer`,
`-uri`, `-xpath`, `p2p-mrepo`); `mycelium-repo`.

With it: `base-package-haicc` without `haicc-reconcile`; the boot's
host-check agreement test (its other half gone); the platform test's
tamper target now `haicc-base-boot/lib/host.js`; `haicc-deployment`
described as the node's HAICC; the workspaces and the lockfile (`npm ci`
leaves it unchanged); the READMEs and `.gitignore` lines naming what is
gone; `haiccing/README.md`.

Their product repositories (`pear-full-square/p2p-swarm-manager`,
`haicc-reconcile`, and others once merged) are left as they are: archiving
them is the human's, on GitHub. The ideas stay in `vision.md` and
`notes/` (until step 2's cleanup).

## Validated

`record/` (`steps/record.sh`): every module's tests, 25 of 25 (6 without a
test script); the package writer, the five packages written.

The full sets from a fresh release (`../../0-setup/fresh-release.sh`,
Node.js off the PATH; by hand, logs not kept):

| `./haicc boot …` | full set |
|---|---|
| `base-package-haicc/test` | 5 passed (6 before: `haicc-reconcile`'s own tests gone) |
| `base-swarm-three-nodes/test` | 17 passed |
| `base-demo-liveness/test` | 25 passed |
| `base-demo-other-host/test` | 25 passed (one run: the intermittent failure of `../../0-setup/` not seen, not fixed) |

Nothing left after: no containers, no networks.

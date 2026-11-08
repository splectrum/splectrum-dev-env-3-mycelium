# Phase 2: status

The second development phase: the creation of a P2P cluster, starting with
p2p-git on Hyperdrive. Request: `pending/phase-2/request.md` on
`pending/default`.

Status (2026-11-06, the human's feedback): the fourth release works for the
human; the folders' names and the log's timestamps for a fifth (`next.md`).

Status (2026-11-06, the fourth release): `setup-47f2b29b0194`, boot 0.5.0, no
hidden folders, published; the human tests it locally (`next.md`).

Status (2026-11-06, the human's report): the third release completed for the
human, but they could not find its log: findings 4 to 7 of
`../steps/phase-3/1-packages-and-boot/6-work-folder/local-run.md`, back to the
implementation session (`next.md`).

Status (2026-11-06, local): **the first HAICC release tested** from its own
download (`../steps/phase-3/1-packages-and-boot/6-work-folder/local-run.md`):
the root's route works; a machine without Node.js stopped at the first boot,
fixed in the second release; output as it happens in the third,
`setup-b8c4a67a5e83`.

Status (2026-11-05, local): **the `haiccing` repositories published, the
from-scratch run done** (`../steps/phase-3/1-packages-and-boot/5-validation/local-run.md`):
both demos run from GitHub's archives; `base-demo-liveness` failed 1 run in
6, `stop-node` racing auto mode (`next.md`).

Status (2026-11-04, evening): **phase 3, step 1 built and validated**
(`../steps/phase-3/1-packages-and-boot/`): the package manager, the
packages, booting, the demos' click and run from a folder of `haiccing`
repositories, a clean home each. The `pear-full-square` products merged;
the `haiccing` repositories wait for the local agent to publish them
(`handover-packages.md`), then the from-scratch run.

Status (2026-11-05): **phase 2 done; phase 3 begun.** Its first step,
packages and the boot, is designed (`packages.md`) and requested; part 0
done; ready to implement (`next.md`).

Status (2026-11-02): **phase 2's request is met; the work is paused** for
the human to look at it locally (`local.md`: what to do there; done). Steps 0 to
10 done (`plan.md`, `../steps/readme.md`); the products merged
(`products.md`), but the two `haiccing` projects (with the local agent);
the handover: `next.md`.

Earlier status (2026-10-31): **the design is settled; implementation starts over
along it.** A first build ran through the request's five steps on a thin
path (2026-10-30). Reviewed afterwards, it had been built before the design
was thought through: it stands as a set of probes, and its findings went
into the design. The design: `node-pattern.md` (settled, with open points)
and `multi-swarm.md` (vision). The plan: `plan.md`.

## The first build, as probes

What it proved, with its records:

- **p2p-git on a persisted Hyperdrive works, under Node and Bare**, through
  p2p-git's own adapter (`bare-for-pear/p2p-git@d7d154d`, which carries
  this phase's fixes): mycelium-git's contract suite 78 of 78, the command
  set 60 of 60 on each runtime, each invocation reopening the same store.
  Test run `test-runs/2026-10-30-r1.bundle`: 627 of 627 met. A repository
  on Hypercore needs no network.
- **Hyperbee for refs: not needed now.** On a Hyperdrive refs are already
  Hyperbee entries; reading objects, not refs, is what costs. A drive is
  single-writer, so a ref's compare-and-swap is the writer's alone.
- **The environment** (`env.md`): Docker runs in a cloud session (daemon
  started by hand; Docker Hub pulls sometimes 429); outbound UDP to the
  public DHT is blocked, UDP inside the host and between containers works.
  Bare runs in a plain container (debian:bookworm-slim and Bare's binary).
- **A private DHT** needs at least two persistent nodes: with one, no
  announcement was found.
- **Nodes on one network reach each other directly**: marked not
  firewalled, they connect every time; left to holepunching, a connection
  opened on one side only and carried nothing.
- **One module tree per process.** Two copies of the Hypercore stack (in
  mycelium-git's and mycelium-node's `node_modules`) failed to replicate
  under Bare; one tree worked. This is one reason for multi-module
  packages with one resolved dependency tree.
- **Two Bare nodes in containers replicate over Hyperswarm**, lazily: on
  the dev repository's `main` (a 13 MB bundle) a node reading the root
  tree received 25 KB (`cluster/runs/2026-10-30-two-nodes-*`).
- **Packages stored once by tree oid** shrink a lot: six modules, 308
  installed folders, 185 instances, a 13.4 MB bundle; materialising four
  modules took 7 s and 22 MB from a replica
  (`cluster/runs/2026-10-30-boot-nodes`).
- **A request-driven deployment repository** brought up a seed and two
  joining nodes and recorded them (`cluster/runs/2026-10-30-deployment.bundle`,
  10 KB).
- rocksdb-native ships about 180 MB of prebuilds for thirteen platforms;
  keeping this platform's only brings it to 20 MB.

Where the first build departs from the design, and why it is superseded:

- One node was one repository (`mycelium-node`); a node hosts many
  repositories, and the node itself is an application.
- `openHyperdrive` and Corestore and Hyperdrive as dependencies sit in
  mycelium-git; storage on Hypercore belongs below it and the node's store
  to the host. This is also in `pear-full-square/mycelium-git@3e021c4`,
  and goes out again with a later update.
- The package repository, bootstrap and deployment repository were native
  git on the host; all repositories now live on Hypercore.
- The bootstrap was a 94 MB checkout mounted into containers, and secrets
  had no design; nodes are now provisioned through an auxiliary swarm,
  secrets in memory only.
- Packages were layouts in JSON per module; they are now multi-module
  packages referenced by gitlinks.
- Container storage, identity and membership were missing.

The first build's code (`mycelium-node/`, the scripts in `cluster/`) was
removed in step 1; its records stay in `cluster/runs/`, its code in this
repository's history (`fa009fd`).

## Deviations

- Four commits (`21b91bf` to `eee62cc`) went onto `main` directly, not
  through `execute/main`, and were pushed; without force-push they stay.
  Every later change went through `execute/main`.

## Product repositories

See `products.md`.

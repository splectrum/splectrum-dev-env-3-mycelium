# To do locally

Written 2026-11-02, when the work paused after step 10 (phase 2's request
met) for the human to look at it on their own machine. Each item says who
does it and how; report back what you find, and the cloud session (or the
next one) picks it up from `notes/next.md`.

Start from an up-to-date clone, on `main`:

```bash
git clone https://github.com/splectrum/dev-env-2-p2p-cluster.git
```

```bash
cd dev-env-2-p2p-cluster && git checkout main && git pull --ff-only
```

## 1. The haiccing projects' first product merge (local agent)

**Done** 2026-11-02: `base-demo-liveness` split `271b052`, product
`f85b958`; `base-demo-other-host` split `756742a`, product `a34735f`;
recorded in step 9's product table.

The cloud session cannot attach `haiccing/base-demo-liveness` and
`haiccing/base-demo-other-host` beside the `splectral` components of the
same names. The steps, for a local Claude Code agent:
`notes/handover-haiccing-merge.md`. Report the split heads and the
product commits back.

## 2. The demos, in the flesh (the human, with the local agent if wanted)

**Done** 2026-11-02: both projects, as below; the report:
`steps/9-click-and-run/demos-local-run.md`.

`demos.md` (the one document since step 9). In short, after section 2's
installs (note the folders moved: `pear-full-square/<module>`):

```bash
sh haicc check base-demo-liveness
```

```bash
sh haicc start base-demo-liveness
```

Then http://127.0.0.1:4400: open the scenario, press **Run**, put the
**Map** beside it (its tab's ⇆), **Run again**. Since step 10 the swarm
keeps its deployment (node-1): when the scenario stops node-1, the swarm
manager in auto mode brings it back after a few seconds. Then:

```bash
sh haicc stop base-demo-liveness
```

```bash
sh haicc start base-demo-other-host
```

and the same; finally `sh haicc teardown` for each. What to look for, and
report:
- `check`: anything missing on your machine, and whether its hint was
  enough (WSL2, Node 24 and Bare 1.36 were fine at the last local run);
- how long `start` takes the first time (the image is built once per
  commit);
- whether the browser opened by itself (WSL: through `cmd.exe`);
- the scenario pages, the map beside them, Run again: anything unclear
  for someone watching;
- after `teardown`, nothing left: `docker ps -a`, `docker network ls`;
  the work folders (`~/.haicc/<project>`) keep only `deployment/`,
  `runs/` and the server's output.

## 3. The deployment on the swarm, by hand (optional)

**Done** 2026-11-02 by the local agent: as recorded, but for the `shadow`
phase's check, which depends on the filesystem's file order (the report
in `steps/9-click-and-run/demos-local-run.md`, finding 7).

Step 10's mechanics without a project, as its validation does them
(`steps/10-deployment-on-swarm/7-validation/demo.sh`, phases `genesis` to
`stop-swarm`): a swarm handed a deployment at genesis, `watch` in manual
then auto mode, a change by `deploy`. Useful to see the manual mode's
report (`topics/deployment` in the swarm's folder).

## 4. What decides the next phase

Phase 2's request is met. The candidates are in `notes/next.md`
("Decisions waiting on the human"); what you see locally may decide.

## Never

Print or copy the vaults (`~/.haicc/<project>/a-vault`, `b-vault`); force-push;
write on `pending/default` anything but requests.

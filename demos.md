# Running the demos on your own machine

The demos are HAICC projects (`haiccing/`): each a test cluster, Splectral
on top with its components, and a scenario to watch. One command brings a
demo up; then everything is clicks in the browser, and a scenario runs
again as often as you like. Local network only: nothing goes to the
internet while a demo runs.

| Project | What you see |
|---|---|
| `base-demo-liveness` | A node goes quiet: node-1 frozen, flagged absent when its lease runs out, a request to it refused, thawed and present again, then leaving gracefully. |
| `base-demo-other-host` | A node on another host: host B's own manager starts a node from an invitation, a request crosses the hosts, the node writes, stops and leaves; the swarm runs on. |

This replaces the steps' instructions (`steps/6-other-host/local-machine.md`,
`steps/7-splectral/local-machine.md` in `splectrum/dev-env-2-p2p-cluster`),
which stay there as records of their steps.

## Without this repository: a work folder

Since phase 3, step 1, each demo is its own repository in `haiccing`, run
from a work folder: no development repository, no `npm install`. The setup
(`haicc-setup.sh`, the release of `base-package-haicc`) extracts its
`haiccing/`; its boot does the rest:

```bash
rm -f haicc-setup.sh && curl -fL --progress-bar --retry 5 --retry-all-errors --connect-timeout 20 \
     -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh \
  && sh haicc-setup.sh ~/haicc-work \
  && ~/haicc-work/boot \
  && cd ~/haicc-work && ./haicc list
```

The setup is about 36 MB. On a poor connection: if the download stops, `curl -fL -C - -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh` continues it where it stopped; run it again until it ends without an error, then `sh haicc-setup.sh ~/haicc-work && ~/haicc-work/boot`.

Step 0 checks the machine first and fixes what is missing only with your
yes (git and Docker Engine with `apt`; Bare's runtime comes with the
setup); the repositories come from `haiccing/sources` (GitHub's by
default). Everything it does is logged in the work folder's `log/`, newest last. The sections
below are for running the demos from this repository, the code as it is
here.

## 1. The machine

`sh haicc check <project>` checks all of this and says what is missing,
with a hint for each:

- **Linux on x86-64.** On Windows: inside WSL2 (tested: Ubuntu 24.04).
- **Docker Engine, rootful, running natively** (in WSL2: Docker Engine
  inside the distribution). Not Docker Desktop, not rootless: the managers
  on the host must reach the Docker networks' addresses.
- **Node.js 22 or later** (24 tested), npm, git.
- Bare's runtime comes with the workspace (`bare-runtime`, `npm install`):
  no global install any more.
- **Free subnets** `172.34.0.0/24`, `172.35.0.0/24` (and `172.36.0.0/24`
  for the other-host demo), **port 4400** free, **UDP from containers to
  the host's bridge addresses** allowed by the firewall.

## 2. Once, while online

```bash
git clone https://github.com/splectrum/dev-env-3-mycelium.git && cd dev-env-3-mycelium
```

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
```

```bash
docker pull debian:bookworm-slim
```

From here the machine can be offline. (`PUPPETEER_SKIP_DOWNLOAD=1` stops
a git dependency's preparation from fetching a browser.)

**An existing clone** from before the modules moved to
`pear-full-square/<module>` (step 9), or before they became one workspace
(phase 3): run this section again; `sh haicc` says so if you don't. What
the old layouts left behind (the top-level `mycelium-git/`,
`mycelium-layer/`, `mycelium-repo/`, and their `node_modules` under
`pear-full-square/`) can be removed:

```bash
rm -rf mycelium-git mycelium-layer mycelium-repo pear-full-square/mycelium-*/node_modules
```

## 3. A demo

```bash
sh haicc check base-demo-liveness
```

```bash
sh haicc start base-demo-liveness
```

`start` deploys what is missing (the work folders, the node image,
Splectral's configuration), then starts Splectral and the swarm: about a
minute the first time (the image is built once per commit). It opens the
browser where it can (Linux desktop, WSL), and prints the URL:
**http://127.0.0.1:4400**.

In the browser:
1. **The menu**: the scenario, Timeline, Map, a page per node.
2. **The scenario's page**: press **Run**. Open **Map** too: its tab's
   **⇆** shows it beside the scenario, so you watch the messages and the
   swarm together.
3. **Run again**, any time: the project is first brought back to its
   declared state (a node that left is started again), then the scenario
   plays.

Stop it (nothing runs; everything it made is kept, and `start` brings it
back), or tear it down (nothing of it left but its records):

```bash
sh haicc stop base-demo-liveness
```

```bash
sh haicc teardown base-demo-liveness
```

**One demo at a time**: both use the swarm name `hosts`, its subnets and
port 4400. Starting the second while the first runs is refused, saying
why; stop the first, then start the second.

The work folder is `manager/<project>`, in this repository's root (`--work=<folder>` for another).
It holds the swarm's folders and vaults (the nodes' secret keys: never
copy them; teardown removes them) and the records: the deployment's
topics (`deployment/`), Splectral's runs (`runs/`).

## 4. Watching from a tablet or phone

Splectral listens on `127.0.0.1`. To reach it from your local network,
change `"host"` to `"0.0.0.0"` in the project's `project.json` (the
`splectral-config` requirement), and run `sh haicc reconcile <project>`:
the configuration is rewritten, and the server restarted on it. Open
`http://<this machine's address>:4400`. Splectral has no sign-in yet, and
its actions start and stop things on this machine: only on a network you
trust, and set it back afterwards.

## 5. When something goes wrong

- `sh haicc status <project>`: what is wanted and what is there.
- `sh haicc reconcile <project>`: brings it back to what is wanted (a
  stopped node started, a stopped Splectral restarted).
- A scenario that fails says why on its page; every action and its result
  is in `manager/<project>/runs/actions` (a topic: one JSON file per
  record).
- A node that does not start usually means UDP to the bridge addresses is
  blocked (section 1).

## For Claude Code

Open Claude Code in the repository's folder and give it this:

> Read `demos.md`. Run `sh haicc check base-demo-liveness` and tell me
> what is missing; do section 2 if needed; then `sh haicc start
> base-demo-liveness` and give me the URL. Don't run the scenario: I will
> press Run in the browser. Don't commit anything. When I say I'm done,
> `sh haicc stop`, and `teardown` if I ask.

Never print or copy the vaults (`manager/<project>/a-vault`, `b-vault`).

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

## A work folder

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
default). Everything it does is logged in the work folder's `log/`, newest last.

Then a demo, from the work folder (one at a time: both use the swarm name
`hosts`, its subnets and port 4400):

```bash
./haicc boot base-demo-liveness
```

Its Splectral is at **http://127.0.0.1:4400**: the menu, the scenario's
page (press **Run**), the map. `./haicc boot base-demo-liveness/test` runs
its tests; the swarms and their commands: `docs/guides/swarms.md`.

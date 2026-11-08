# base-demo-liveness

A demo: a node goes quiet. One host runs the swarm `hosts`, its master and
node-1, each in a container; its Splectral server shows it in the browser
and plays the scenario: node-1 frozen, flagged absent once its lease runs
out (a request to it refused at once), thawed and present again, then
stopped, leaving gracefully; the swarm runs on. Self-contained: it carries
the code its swarm runs (`modules/`: the p2p node, Splectral and the
scenario), its configuration (`swarms/hosts/`) and its tests.

```sh
./haicc boot base-demo-liveness       # the swarm, its nodes running; Splectral at http://127.0.0.1:4400
```

Open the page, choose the scenario, press Run; run it again any time
(`./hosts/haicc boot` first brings node-1 back). Then
`./haicc shutdown hosts` (its nodes and its server stopped, its config kept)
or `./haicc teardown hosts` (nothing of it left).

- `swarms/hosts/`: its nodes (`nodes.json`), its codebase (`modules.json`),
  its Splectral components and port (`splectral.json`).
- `test/`: `validation` (its modules load, its sets agree), `full` (and the
  modules' own tests, and `liveness`: the demo played on a fresh install).

Written by the package writer from the development repository
([splectrum/dev-env-3-mycelium](https://github.com/splectrum/dev-env-3-mycelium)): not edited here.

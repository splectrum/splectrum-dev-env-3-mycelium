# base-demo-other-host

A demo: a node on another host. Host A runs the swarm `hosts`, its master
and node-1, each in a container; host B has its own node manager and vault
and runs nothing. Its Splectral server shows both and plays the scenario:
host A gives host B an invitation (public facts only), host B's node
manager joins remote-1 from it (its key from host B's vault, its code from
the master, over the swarm), a request from host A crosses to it, it writes
a note, and it stops while the swarm runs on. On one machine, host B is a
folder of its own. Self-contained: it carries the code its swarm runs
(`modules/`: the p2p node, its node manager, Splectral and the scenario),
its configuration (`swarms/hosts/`) and its tests.

```sh
./haicc boot base-demo-other-host     # the swarm on host A; Splectral at http://127.0.0.1:4400
```

Open the page, choose the scenario, press Run; `./haicc boot hosts` brings
it back to its start for another run. Then `./haicc shutdown hosts` or
`./haicc teardown hosts`.

- `swarms/hosts/`: its nodes (`nodes.json`), its codebase (`modules.json`),
  its Splectral components, its other host and its port (`splectral.json`).
- `test/`: `validation` (its modules load, its sets agree), `full` (and the
  modules' own tests, and `other-host`: the demo played on a fresh
  install).

Written by the package writer from the development repository
([splectrum/dev-env-3-mycelium](https://github.com/splectrum/dev-env-3-mycelium)): not edited here.

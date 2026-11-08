# Swarms and nodes, level by level

For a user, in a booted work folder (`cd ~/haicc-work`). Each level has its
own `haicc`; a `boot` or `shutdown` works on the config of the folder it is
called from. Removing asks first (`--yes` agrees). Names are URI parts:
`Hosts` becomes `hosts`, and it says so.

A swarm is made from a package's configuration (`nodes.json` and the rest,
copied from it). Nodes can then be added and removed by hand, unless the
swarm was made `--strict`.

## The root (the work folder)

```bash
./haicc boot                 # the host's prerequisites; each swarm in swarms.json booted
./haicc boot base-swarm-three-nodes
                             # a package's swarms (here: three-nodes): the package fetched
                             # if not in haiccing/, checked intact; each swarm's folder, its
                             # config files copied in, its entry in swarms.json; booted (the
                             # master's build assembles the codebase into
                             # three-nodes/master/packages/base-swarm-three-nodes/)
./haicc boot base-swarm-three-nodes/three-nodes --as=lab
                             # one of its swarms, under another name
./haicc boot base-swarm-three-nodes --strict
                             # its nodes its package's only: none added or removed by hand
./haicc boot my-swarms --from=user
                             # a package from another folder (a development package: without
                             # a hash it is mixed, and said)
./haicc boot three-nodes     # a swarm here: booted from its own copy
./haicc shutdown [three-nodes]   # each swarm's (or one's) shutdown: their nodes removed, configs kept
./haicc teardown three-nodes     # the swarm removed: its nodes, its folder, its entry
./haicc list                 # the swarms here, their nodes
./shutdown                   # cold: everything back to the setup (haiccing/, log/, bare/ kept)
```

## A swarm

```bash
./three-nodes/haicc boot           # each node in nodes.json: built, booted, the master first
./three-nodes/haicc boot node-1    # one of them
./three-nodes/haicc boot node-3    # a node added by hand (--role=master|node; not in a strict swarm)
./three-nodes/haicc shutdown [node-1]   # each node's (or one's) cold shutdown: its folder removed
./three-nodes/haicc teardown node-3     # a node removed, and its entry (not in a strict swarm)
```

A node's boot shows as it happens, each line marked `  | ` (`--no-echo`: its
last line only).

## A node

A node's boot is in two parts. Its cold boot (by the swarm): its folder,
the platform's pair copied in, its config (`node.json`: its key, kept while
its folder is), its launcher; the master's also gets the swarm's codebase
in its `packages/`. Its warm boot (its own HAICC) validates what it was
given, then starts its container, running the swarm's node from the
master's `packages/` (read-only):

```
  |   ok     base-package-haicc: intact (0163b1b5643b)
  |   ...
  | Ready: 6 test runs passed (base-package-haicc, base-package-pkgm)
  |   its image: haicc-node:de24f4f1b7fb (Bare's runtime; the code mounted, not in it)
  |   its container haicc-43311a2c-three-nodes-master (master, 172.18.0.10 on haicc-43311a2c-three-nodes): ...
  |   ok     the node running: /three-nodes/master, its key 393a439519f0, the swarm's DHT at 172.18.0.10:49737 (11.7 s)
  | Running
The node three-nodes/master: up
```

Its log: `docker logs <container>` (JSON lines: every module's events).

## A swarm with Splectral

A swarm whose package names Splectral components gets a Splectral server on
the host, started with the swarm's boot and stopped with its shutdown:

```bash
./haicc boot base-demo-liveness      # ... its Splectral: http://127.0.0.1:4400
```

Open the page; a scenario's page has Run. Its output:
`hosts/splectral/server.log`; its runs: `hosts/splectral/runs/`.

Not intact (a file changed in its copy) or a test failing: the node says
which and is not up; the swarm's boot stops there. Shut it down and boot it
again to build it from scratch.

```bash
./three-nodes/master/haicc boot              # its warm boot again
./three-nodes/master/haicc shutdown          # its container stopped and removed, its folder (its key) kept
./three-nodes/master/haicc test base-package-haicc [--set=validation]   # intact, then its tests
./three-nodes/master/haicc list              # its packages, their hashes
```

Never edit a file in a node's packages: they are hard links to the work
folder's own copy, so an edit changes every copy.

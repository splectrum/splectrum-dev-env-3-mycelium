# The platform: levels, boot, validation, the log

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## Three levels, each its own HAICC

**Built.** A host runs a work folder; a work folder holds swarms; a swarm
holds nodes. Each level is a folder with its own launcher, `haicc`:

| level | folder | its `haicc` runs | its config |
|---|---|---|---|
| host | the work folder | the root's HAICC (`haicc-base-boot`) | `swarms.json` |
| swarm | the swarm's folder | the root's HAICC, in that swarm | `nodes.json` |
| node | the node's folder | the node's own HAICC (`haicc-deployment`), from the platform's package copied in | its own |

*Why*: each level does its own work and nothing else; the folder you are in
is the context (no "current swarm" setting: `cd` is enough, and visible).
The host's structure (the work folder, a swarm's folder) is run by the
root's HAICC and logs in the root's log; a node runs its own HAICC and logs
in its own log, echoed back to whoever booted it.

## Cold boot and warm boot

**Built.** Every boot has two parts:

- **cold**: make the folder, copy in the minimum code, write the launcher,
  hand over;
- **warm**: the code that was copied in runs, and checks itself.

| level | cold | warm |
|---|---|---|
| host | `./boot`: step 0 (Linux x86-64; the runtime in `bare/` runs here); the platform's package copied into `packages/`; `./haicc` written | `./haicc boot`: the host's prerequisites (git; Docker Engine installed, running, rootful, native; the user in its group), each fixed only with a yes; then `haiccing/install` if there |
| node | the swarm's HAICC: the node's folder, the platform's package copied in, its launcher | the node's `./haicc boot`: what was copied in, validated (below) |

*Why*: the cold part is plain and small (shell, a copy), so it can run
before anything of HAICC can; everything after it is HAICC's own code,
checking itself.

## A node validates what it was given

**Built** (step 2). A node's warm boot, for each package copied in:

1. **intact**: its hash against the one the package writer recorded
   (`package.json`'s `pkgm.hash`; the package manager's `packageHash`:
   everything but `package.json` and `.git`, its `LICENSE` included, the
   readme last). A changed or
   incomplete copy is said and not run;
2. **working**: its `validation` test set, in place.

The node is up only when both pass; otherwise it says which, and the
swarm's boot stops there. On demand: `./<swarm>/<node>/haicc test
<package> [--set=<set>]`, intact first.

Then, the swarm having a codebase, **the node runs it** (below).

*Why*: a node runs only code it can show is what was written and tested.
Tested by the platform test: a file replaced in a node's copy, the node
not up, the swarm's boot stopped, repaired by a shutdown and a boot from
scratch.

## The platform is two packages: HAICC and the package manager

**Built** (the human, 2026-11-07; revises "the package manager is part of
the platform's package"). HAICC (the levels, the boot, the lifecycle) and
the package manager (checking, assembling, testing, deploying packages) are
different concerns: two packages, `base-package-haicc` and
`base-package-pkgm`, each written, tested and published on its own.

- **Every level has both**: the cold boot copies both in. HAICC uses the
  package manager from beside it (the level's `packages/base-package-pkgm/`):
  the one exception to "a package carries what it runs on", narrow and
  explicit: the platform is a pair; any other package stays
  self-contained.
- **The boot, at every level**: the cold boot copies both packages in
  directly (hard links; no package code needed for that); then the warm
  boot (the level's HAICC) has the package manager deploy both properly
  (intact, validation tests). Once both are deployed, the level is ready:
  the master, to deploy other packages. The root follows the same pattern
  with less to do.

## A node runs the swarm's codebase, in a container

**Built** (part 3, 2026-11-07). One container per node, started by the
node's own warm boot (after its validation), stopped by its shutdown, from
its config alone:

- **Its config**, `<node>/node.json`, written by its swarm's cold boot: its
  name, role and **key** (made at its first build, kept while its folder,
  its manager, is: in readable text for now, the human: a more secure way
  once it all runs); for a swarm with a codebase, its container, network,
  address, its code (the master's `packages/<package>/`) and, for a node
  that is not the master, the master's key and DHT (from the master's
  config, written there when it started).
- **The image**: a plain Debian base and Bare's runtime (the setup's
  `bare/bare`, stripped), built locally, tagged by the runtime's
  hash; no code in it.
- **The code**: the master's `packages/<package>/`, mounted read-only at
  `/app` in every node's container on its host (other hosts: replicated,
  with the other-host demo).
- **Hardened**: read-only root, every capability dropped, no new
  privileges, an unprivileged user, memory capped with no swap, no core
  dumps, the store on a tmpfs.
- **The swarm's network**: one Docker network per swarm, made with its
  first node, removed with its shutdown; containers and networks labelled
  with the install (`haicc.install`, its path) and the swarm.
- **Up** when the node says `node-started` (its log: the container's
  output, `docker logs`); the master's key and DHT recorded in its config
  (`live`) for the others. A node's cold boot stops it first, if it runs.
- **The managers**: the old node and swarm managers' starting, stopping and
  ordering are now the node's and the swarm's HAICC; their observer and
  topics come back with Splectral (parts 4, 5).

Tested: `haicc-deployment`'s unit tests (the container's arguments); the
deploy test of `base-swarm-three-nodes` (three containers, the nodes
registered with the master, a node's shutdown and boot keeping its key,
the swarm's shutdown leaving nothing in Docker).

## A swarm's Splectral: its server, on the host

**Built** (part 4, 2026-11-07). A swarm whose package names Splectral
components (`swarms/<swarm>/splectral.json`: `components`, the host's name
in scenarios, `port`) gets a Splectral server:

- **On the host**, not in a container: it reads the containers' logs and
  acts on them. Started by the swarm's boot (after its nodes), in the
  background (a session of its own), stopped by the swarm's shutdown; its
  URL said. Its folder: `<swarm>/splectral/` (`config.json`, `server.pid`,
  `server.log`, `runs/`: its actions and scenario runs).
- **From the master's `packages/`**: the components are modules of the
  swarm's codebase (its `modules.json`), so the server and its extensions
  are what the package carries.
- **What it watches** (`splectral-p2p-watchers`, the source
  `haicc-swarm`): each node's container log (`docker logs -f`: the node's
  JSON lines), found through the nodes' `node.json`; a node started again
  (a new container) followed again.
- **What it does** (`splectral-p2p-actions`): `start-node` and
  `stop-node` through the node's own HAICC (`<swarm>/<node>/haicc boot`,
  `shutdown`); `pause-node` and `resume-node` through Docker (pause,
  unpause); `send-request` as a peer of the swarm from the host (its
  gateway on the swarm's network; the master's key and DHT from its
  config). `state` and `write` only for a node a node manager runs (below):
  a node HAICC runs is a detached container, which its observer's
  management channel does not reach.
- **Other hosts, inside the swarm** (part 5b; the human: HAICC is the
  outside, what runs inside the swarm need not use it): a demo's
  `splectral.json` names them (`hosts`); each is a host of its own on this
  machine (`<swarm>/splectral/hosts/<host>/`, its vault, its boot program's
  code: the swarm's package). Joining is the previous implementation,
  ported to Bare: `invite` (an invitation from what runs on the swarm's
  host: the master's key and DHT, the network, the packages from the
  master's genesis, the image), `start-node-from-invitation` (that host's
  node manager, `p2p-node-manager join`, detached: its node's key from the
  host's vault over the auxiliary swarm, its code replicated from the
  master's packages, the management channel kept), `stop-node` (its
  manager stopped); watched through the manager's topics (`p2p-host`),
  shown as not controlled by the swarm's host. Its managers stop with the
  swarm's Splectral.
- **Splectral on Bare**: the server on `bare-http1` (Server-Sent Events
  down, actions up), the generic modules on Bare's own, their tests on
  brittle; the browser's libraries (React, htm) found in the codebase's
  `node_modules`.

Tested: the modules' own tests; `base-demo-liveness`'s `liveness` (a fresh
install, the demo deployed, its page answering, its scenario played
through the server, torn down).

## The setup's pair is a bootstrap; the root's boot refreshes it

**Built** (the human, 2026-11-07). HAICC finds the package manager through
`lib/pkgm.js` (the package beside it, or, in this repository, the module);
the package writer writes the pair together (`together`); `fetch.sh
--refresh`; the package manager's `deploy` (staged beside, intact,
validation set, then in place; else nothing changed).

- **The setup carries a HAICC and a package manager package sufficient to
  install packages**: a bootstrap. Once the release is stable it does not
  change: it is only needed to boot up.
- **Every root boot refreshes both from the sources and redeploys**: the
  root's warm boot (after the host's prerequisites) fetches both packages
  from the sources (`haiccing/sources`) and has the package manager deploy
  them at the root, then the swarms' nodes are booted with them. Only these
  two packages; nothing compared, nothing more recorded: what runs is what
  the sources hold. The setup's pair is not kept.
- **Same names only**: the pair carries no version in its names; the warm
  boot refreshes `base-package-haicc` and `base-package-pkgm` by those
  names. What an install then runs may differ (its config can switch to
  other packages): that sorts itself out above the boot, which stays the
  same for every such case (the human, 2026-11-07).
- **Changing to another name** (a version in the name, later): a shortcut
  link from the name in use to the package; nothing more.

## A node's codebase: the master's package repository

**Built** in part (2026-11-07): assembled at every build of the master
(its cold boot), into the master's `packages/<package>/` (`<swarm>/master/packages/`: every
level's packages are in its `packages/`), from the package
`swarms.json` names; a swarm's shutdown removes it with the master's
folder, its boot assembles it again. Mounting it into the nodes:
containers: built, above. A swarm's codebase is assembled by the package
manager from its package (the swarm's `modules.json` and the package's
`modules/`) into the master node's **package repository**. Nodes use only
what is there: an application refers to it and carries no copies; a
package it refers to that is not there fails (and may later trigger an
install request). For now the repository is a folder on the master,
mounted read-only into the containers on its host; replicated to other
hosts with the p2p step. Assembled again later, it says what differs from
what the swarm was made with.

## The log, and what a command prints

**Built.**

- **Everything a command prints** goes to the terminal and, in the same
  order, to the log: `log/` of its level's folder, files of 10 KB named by
  their first command's start in UTC (`20261107T081530Z.log`, so `ls`
  lists them in time order; the newest is the current one; a new file
  starts only with a new command).
- **Each command says itself** on stdout and in the log, at its start
  (`== <start> <command as called>  (in <folder>)`) and at its end
  (`== exit <code>, <seconds> s`). The command is the one called (the
  launchers pass their `$0`). The start is wall-clock time; how long is
  measured on a clock that never steps back (`bare-hrtime`; in the shell,
  the machine's uptime): a wall clock can (WSL2's did).
- **Nested commands**: a command run by another is echoed by it, each line
  marked `  | ` (`--no-echo`: only its last line); a swarm's command run by
  the root does not log itself (the root logs what it echoes).
- **Levels**: normal (state changes and outcomes), `--verbose`, `--debug`.
- **Exit codes**: 0 done; 1 not done (the output says what is missing); 2 a
  bad call.

*Why*: what happened can always be read back, in order, without hidden
state; and a user who chains commands can see where each starts and ends
(the human, on the sixth release).

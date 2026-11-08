# The work folder

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## Its layout

**Built** (today's layout):

```
<work>/
  boot  shutdown        the cold boot and the cold shutdown (stubs naming their setup)
  haicc                 the root's launcher, written by ./boot
  bare/                 Bare's runtime, as the setup placed it
  haiccing/             sources, [install], haiccing's packages (as fetched)
  packages/             what runs at the root: base-package-haicc (hard links to haiccing/'s)
  log/                  the log
  swarms.json           the host's swarms
  <swarm>/              a swarm: haicc (its launcher), its config files (from its package:
                        nodes.json, modules.json, ...), a folder per node (a swarm runs the
                        root's HAICC: it logs in the root's log/)
    <node>/             haicc (its launcher), packages/ (the platform's pair, hard links), log/;
                        the master's packages/ also hold the swarm's codebase
                        (packages/<package>/, assembled)
  swarms/test/<test>/   a test's run, while it runs
```

**Agreed** (the next layout): the top fixed, no names of the user's there;
every swarm under `swarms/`:

```
<parent>/<install>/     installs side by side: one platform release each
  boot  shutdown  haicc  haicc.lock
  bare/  log/  packages/
  haiccing/             haiccing's packages only (sources, contents.json)
  user/                 the user's own packages (sources, contents.json)
  swarms/
    swarms.json         the host's swarms, fully qualified (where each came from, its hashes)
    <swarm>/            haicc, its config files (copied from its package), master/ (its
                        packages/<package>/: the swarm's codebase), <node>/
    test/<test>/        test runs
```

- **One platform per work folder**, the one it was set up from; another
  platform or release: another install beside it.
- **Docker resources** labelled with the install (by its absolute path) and
  their path in it; cleanup by label.
- **One state-changing command at a time**: `haicc.lock`, visible.

## Boot and shutdown, by level

**Built.** A `haicc boot` or `haicc shutdown` works on the config of the
folder it is called from, and keeps it.

| called from | its config (kept) | `haicc shutdown` | `haicc boot` |
|---|---|---|---|
| a node | its own (`node.json`) | its container stopped and removed | its warm boot (validation; then its container started: the swarm's node running) |
| a swarm | `nodes.json`, its launcher | each node's cold shutdown (its folder removed), the master last | each node in `nodes.json` built from scratch and booted, the master first |
| the root | `swarms.json` | each swarm's shutdown | the host's prerequisites; each swarm booted; `haiccing/install` |
| the work folder, cold | `haiccing/`, `log/`, `bare/` | `./shutdown`: everything else removed, back to the setup | `./boot`: set up from `haiccing/`, then `./haicc boot` |

- **One thing made or removed, from its parent** (built): `./haicc boot
  <repo>` makes a package's swarms (below); `./haicc teardown <swarm>`
  removes one and its entry. In a swarm, `boot <node>` adds a node
  (`--role=`), `teardown <node>` removes one, unless the swarm is strict
  (below).
- **A swarm's shutdown is a cold shutdown of its nodes**, keeping the
  swarm's config: its boot builds them again from `nodes.json`. *Why*: a
  node is made from its config and the platform's package; nothing in its
  folder needs keeping yet (data backup: later).
- **Removing is asked first** (`--yes` agrees). A plain remove for now;
  logs are kept; teardown with checkpointing and backup: on the roadmap.

## Swarms come from packages

**Built** (2026-11-07). A swarm is made only from a package's
configuration: no empty swarms, no building by hand.
`pear-full-square/haicc-base-boot/haicc.js` (`deployPackage`); tested by
its unit tests, the platform test (a swarm from the test's own
configuration, `--from`), and `base-swarm-three-nodes`' `deploy` test (a
sealed package through a fresh root).

- `./haicc boot <repo>[/test/<test>][/<swarm>]`: the repository from
  `haiccing/` by default; `--from=<folder>` names another root (`user`, or
  any folder of packages); `--as=<name>` renames a single swarm. Without a
  swarm named: all of the repository's, named by its folders.
- The package is checked first: from `haiccing/`, it must be intact (its
  recorded hash), else it is refused; from `--from`, a folder without a hash
  is a development package: **mixed**, said and recorded.
- Making a swarm: its folder, its launcher, the `.json` files of
  `swarms/<swarm>/` copied in, its entry in `swarms.json` (the package, its
  root, the swarm's folder in it, its hash, sealed or mixed, strict or not);
  then booted. The master's build assembles the codebase into its
  `packages/<package>/` (below), every time it is built.
- A swarm already there, from the same root and path: booted from its own
  copy (the package not read again); from another: refused. Its name alone
  (`./haicc boot <swarm>`) boots it too.
- **Strict is an option, not the default** (the human, 2026-11-07):
  `--strict` when it is made: its nodes are its package's only, none added
  or torn down by hand (a swarm changed: its package changed, the swarm made
  again). Without it, nodes are added and removed by hand, in its
  `nodes.json`.

## Names

**Built.** A name (a swarm, a node) is a URI part: lowercase letters,
digits, single hyphens. A name that is not is cleaned into one, and the
change said. A path where a name is expected is refused (exit 2) with the
command to use instead. Names the work folder uses itself (`haicc`, `log`,
`packages`, `swarms`, ...) are refused for a swarm.

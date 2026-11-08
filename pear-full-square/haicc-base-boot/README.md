# haicc-base-boot

HAICC's boot and the root's part of HAICC, for a work folder (no hidden folders: everything
in plain sight): plain shell for stage 1, Bare for the rest (the runtime
carried by the setup, Bare's own modules, `brittle` for the tests); nothing
to download. Kept tiny and stable (it says its version, `VERSION`); no secrets.

```sh
sh haicc-setup.sh ~/haicc-work [--sources=folder:<path>|github:<org>]   # the setup: extracts haiccing/
~/haicc-work/boot [--yes] [--verbose]                                      # the cold boot, both stages
cd ~/haicc-work && ./haicc list
```

## The work folder

```
<work>/
  boot          the cold boot (a stub naming its setup): set up from haiccing/, then ./haicc boot
  shutdown      the cold shutdown (a stub): everything HAICC made removed, back to the setup
  haicc         the launcher, written by the boot: ./haicc <command>
  haiccing/     sources, [install], the repositories
  swarms.json   the host's swarms (the root's config)
  packages/     the code: base-package-haicc, copied whole at the first boot (this module runs from it)
  bare/         Bare's runtime, as the setup placed it (pinned by its sha256)
  log/          the log files (the setup's, the boot's, every command's), named by their start
  <swarm>/      a swarm on this host: haicc (its launcher: the root's HAICC, in that swarm),
                nodes.json (its nodes here, their roles: the swarm's config), and a folder per node:
    <node>/     a node's manager: haicc (the node's own HAICC), packages/, log/
```

- **The setup** (`release.sh` makes it from `base-package-haicc` as
  written): one self-extracting file, `sh` and `tar` only, extracting
  `boot` and `shutdown` (the stubs naming their setup), `haiccing/sources`
  and `haiccing/base-package-haicc/`.
- **The setup carries Bare's runtime** (`release.sh <package> <out>
  [<runtime>]`: the one named, else the `bare` on the PATH), not the
  package's git: extracted to `bare/`, checked against the sha256 the setup
  pinned.
- **Stage 1** (`boot.sh`): step 0, Linux x86-64 and the runtime in `bare/`
  running here (`step0.sh`, `requirements`); HAICC's package copied whole into `packages/base-package-haicc/`
  at the first boot, as hard links (no space taken twice; no updates:
  versions later); `./haicc` written (it runs HAICC on Bare); then stage 2.
  A node's cold boot copies the package in the same way. One variable: `HAICC_WORK`, the
  work folder.
- **Stage 2** (`./haicc boot`, `haicc.js`): the host's other prerequisites
  (`lib/host.js`: git; Docker Engine installed, running, in its group,
  rootful and native), each fixed only with a yes; then `haiccing/install`
  if there (one `./haicc` command a line, stopping at the first failure),
  or the next commands.
## Boot and shutdown, by level

A `haicc boot` or `haicc shutdown` works on the config in the folder it is
called from; the config is kept. Shutdowns are plain removes, asked first
(`--yes` agrees).

| Called from | Its config (kept) | `haicc shutdown` | `haicc boot` |
|---|---|---|---|
| a node, `<swarm>/<node>/` | the node's own | its container removed | its container started again |
| a swarm, `<swarm>/` | `nodes.json` (and its launcher) | each node's cold shutdown (its folder removed), the master last | each node in `nodes.json` built from scratch and booted, the master first |
| the root, `<work>/` | `swarms.json` | each swarm's `haicc shutdown` | the host's prerequisites, then each swarm in `swarms.json` booted |
| the work folder, cold | `haiccing/`, `log/`, `bare/` | `./shutdown`: everything else removed, back to the setup | `./boot`: set up from `haiccing/`, then `./haicc boot` |

Making and removing one thing, from its parent:
- `./haicc boot <swarm>`: the swarm added to `swarms.json`, its folder,
  launcher and `nodes.json` made, then booted. `./haicc teardown <swarm>`:
  its shutdown, its folder and its entry removed.
- `<swarm>/haicc boot <node>`: the node added to `nodes.json` with its role
  (the first: `master`, then `node`; `--role=`); its cold boot: its folder
  made, the platform's package (`base-package-haicc`: HAICC and the package
  manager) copied in whole, its launcher written; then its warm boot,
  `<swarm>/<node>/haicc boot`: what was copied in, validated by the node
  itself: each package intact (its hash against the one it was written
  with, by the package manager), then its validation set; up only when all
  pass, else it says which and the swarm's boot stops there. Its output shown as it happens (`--no-echo`: its
  outcome only). `<swarm>/haicc teardown <node>`: its shutdown, its folder
  and its entry removed.
- Names are required, made URI parts if they are not (the change said).
- Logs are kept, and the runtime (`bare/`). Later: teardown with
  checkpointing and backup; a node's container, with the swarm's step.

- The host's structure (the root, a swarm's folder) is run by the root's
  HAICC and logs in the root's `log/`; the swarm's structure (its nodes) by
  each node's own HAICC, logging in its own `log/`, echoed to the root.
- **The root's commands**: `boot [<swarm>]`, `shutdown`, `teardown <swarm>`, `fetch
  <repository>` (with what it requires, from `haiccing/sources`: `folder
  <path>`, `github <org>`), `list` (the swarms, their nodes and roles).
- **The host checks are the boot's own copy**: `haicc-reconcile`'s machine
  kinds hold the same for projects; a test keeps the two agreeing.

## A package's functionality, by its URI: tests

`./haicc boot <repo>/test/<test>` boots a package's test (from `haiccing/`,
or `--from=<folder>`): its folder copied into its run, `swarms/test/<test>/`;
its cold boot (its `boot` script) run there, with `HAICC_WORK`,
`HAICC_PACKAGE` (the package under test), `HAICC_RUN` (its run) and
`HAICC_PLATFORM`; its result its exit code; then its teardown (its own
`teardown`, else the platform's, `platform/test/teardown`: the run removed;
`--keep` leaves it). `./haicc boot <repo>/test` runs a set (`--set=`,
default `full`; `test/<set>.json`): the tests that run in place first (the
package manager), then each booted one. A test that needs Docker Engine
where it is not ready: skipped, said; one that changes what is outside its
run (`test.json`: `destroys`) runs only with a yes. Everything it prints
goes to the root's log.

## Logged

Everything a command prints, the setup's and stage 1's included, goes to
`log/` too, in order: files of 10 KB, each named by its first command's
start in UTC (`20261106T103312Z.log`), so `ls log/` lists them in time order
and the newest is the current one; a header line (the real start, the
command, its folder) and a close line (its exit code, how long) each.
`--verbose` says each check's detail.

## Step 0, what HAICC needs to run

Before anything of HAICC runs (`step0.sh check <runtime>`, `requirements`):
Linux x86-64, and Bare's runtime, as the setup placed it (`bare/bare`),
running on this host. Each with what was found, what is required, ok or not, and what to do;
it changes nothing. Exit 0 when all is met, 1 when not (the boot stops).
Nothing to fix there: the runtime comes with the setup, no download.

The host's other prerequisites are stage 2's (above).

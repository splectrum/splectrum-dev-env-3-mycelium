# For the local agent: what the release is now

Updated 2026-11-13 by the cloud session, for the local agent (a Linux
x86-64 machine with git, curl and tar; no Node.js needed). The task itself
is in `prompt-local.md`; this is its background. The earlier releases (a
setup file, three signed bundles, an executable) are in `local-run.md`,
`local-note.md` and this file's history: none of that applies any more.

## What changed

- **No executable, no setup file.** The boot is its bundle, run with Bare.
  `tools/boot-release.js` and `tools/haicc-try.sh` are gone.
- **No signing.** Nothing is signed; the publisher's key is not used: we
  are not set up for it yet.
- **Releases are yours to create**, on the human's word (below). The
  sources are built locally and linked locally first.
- **The `haicc` command** is sh scripts (`haiccing/base-linux-haicc`),
  installed by one file, `haicc-install.sh`.

## What a run is

```sh
tools/bare tools/release.js                  # the sources, built into sources/
sh haiccing/base-linux-haicc/test/run.sh     # the whole flow, in a temporary folder
```

and, for the human, in their own home:

```sh
sh haiccing/base-linux-haicc/haicc-install.sh
haicc sources link <clone>/sources
haicc prereq
haicc boot
haicc / boot/deploy host base-component-haicc
haicc /host service/initialise
haicc /host service/start
```

- `haicc`'s own folder is `~/.haicc`: its scripts, the pins, the sources
  list, Bare (unpacked by `haicc prereq` from the sources) and the work
  folder (`~/.haicc/work`: the boot mrepo, the package store).
- Only `haicc sources download` reaches the network; nothing in a run
  above does, once `tools/release.js` has fetched Bare's tarball.
- A runtime is a process that keeps running: the boot mrepo's after
  `haicc boot`, one more for each mrepo deployed. To stop them all:
  `pkill -f "bin/bare $HOME/.haicc/"`. To start over: stop them, then
  remove `~/.haicc/work`.

## Releases: created on the local machine

Decided by the human (2026-11-13). The cloud session cannot create a
GitHub release; it can only push commits. So:

- **Where**: a release on each package's own repository
  (`github.com/haiccing/<package>`), not in a repository of sources.
- **What**: what `tools/bare tools/release.js` built for that package,
  from the commit you tested: its bundle and what belongs with it, as
  `sources/` holds it (the manifest entry, its native addons). For
  `base-linux-haicc`: `haicc-install.sh`. Bare is third party: it is not
  ours to release.
- **How**: with `gh`, as you published before (`local-run.md`). The
  script of that time, `tools/publish.sh`, went with the clean-up and
  signed its manifest: do not bring the signing back. The local sources
  keep the structure you know.
- **When**: only on the human's word, and only after the tests of
  `prompt-local.md` passed on that commit.
- **The network is not good enough for many downloads**: prefer few
  files per release over many.
- **Record it** in `local-run.md`, a new section: the commit, each
  repository, its tag, its assets with their sizes and hashes, the URL
  each is downloaded from. The download side is not built yet
  (`haicc sources download` fetches Bare only): it will be written to
  match what you record, so say exactly what you published and how you
  named it.

## Where things stand


`readme.md`, parts 30 to 37, and `handover-next.md`. Known and not built:
our packages are not published, so `haicc sources download` fetches Bare
only; a position deeper inside `main` is refused by `haicc`; teardown does
not cascade (tear down a node before its host).

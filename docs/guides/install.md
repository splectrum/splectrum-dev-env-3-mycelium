# Installing HAICC, and testing it

For a user. Linux on x86-64 (on Windows: inside WSL2), with `curl` and
`tar`; for swarms, Docker Engine (rootful, native: not Docker Desktop) and
git, which the boot checks and fixes with your yes.

## 1. Download the setup

One file, about 39 MB: it carries everything HAICC runs on.

```bash
rm -f haicc-setup.sh && curl -fL --progress-bar --retry 5 --retry-all-errors --connect-timeout 20 --speed-time 30 --speed-limit 1000 \
     -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
```

On a poor connection, if the download stops (or stalls: under 1 KB/s for 30 s
ends it), continue it where it stopped,
as often as needed, until it ends without an error:

```bash
curl -fL -C - --speed-time 30 --speed-limit 1000 -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
```

## 2. Set up a work folder

```bash
sh haicc-setup.sh ~/haicc-work
```

It extracts `~/haicc-work/`: `boot`, `shutdown`, `bare/` (Bare's runtime,
checked), `haiccing/` (the platform's two packages, HAICC and the package
manager, and `sources`: where packages come from, GitHub's `haiccing` by
default; `--sources=folder:<path>` for a local folder of repositories). Run again on the same folder: said,
nothing changed. A different setup needs a new folder.

## 3. Boot it

```bash
~/haicc-work/boot
```

The cold boot checks Linux x86-64 and that Bare's runtime runs here, copies
the platform's two packages into `packages/` and writes `./haicc`; then the
warm boot (`./haicc boot`) checks git and Docker Engine (installed, running,
rootful, native, you in the `docker` group), fixing what is missing only
with your yes (`--yes` agrees beforehand), and refreshes the two packages
from the sources: fetched again, and deployed by the package manager
(intact, validated). Every root boot does this: the setup only has to get
it started. `Booted.` when done.

`./haicc sources` lists what the sources hold (kept as
`haiccing/sources.json`).

## 4. Test the release, where it landed

```bash
~/haicc-work/haicc boot base-package-haicc/test
```

The full set: the modules' own tests, the package's, and the platform test
(a fresh install inside its run, worked through every level). Expect
`Passed: 6 passed, 0 failed, 0 skipped` (about 45 s). The quick check,
nothing started: `--set=validation`.

## What is where

- Everything is in the work folder, in plain sight; nothing hidden.
- Everything it printed is in `log/`, newest file last.
- `./shutdown` takes the work folder back to the setup (keeping `haiccing/`,
  `log/`, `bare/`); `./boot` sets it up again.

Next: [swarms.md](swarms.md).

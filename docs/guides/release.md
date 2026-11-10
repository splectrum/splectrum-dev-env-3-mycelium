# Publishing a release, and checking it

For the local agent (a machine with push access to the `haiccing`
organisation and `gh`), with the human's OK for each release. The step by
step for the current release: `steps/2-rebuild/handover-local.md`.

## 1. Build, check, publish

From this repository at the commit to publish, its changes committed:

```bash
sh tools/install.sh
sh tools/publish.sh <folder> --key-dir=<folder> [--push]
```

- **The packages**: the boot's, HAICC's and mrepo's, written as bundles by
  the package writer (each package's tests first: nothing written if one
  fails), as one source (`<folder>/out/source`: the bundles, their addons by
  hash, one manifest), signed with the publisher's key
  (`<key-dir>/publisher.secret`, made once with
  `tools/bare tools/setup/keygen.js <key-dir>`: on that machine only, never
  in a repository, never printed).
- **The setup**: `<folder>/out/haicc-setup.sh` (`tools/setup/build.js`): the
  source and `boot.json` (the publisher's public key) behind a shell header
  that ensures Bare (pinned by the lockfile, fetched and checked; carried
  with `--with-bare`, for an air-gapped setup).
- **Checked as a user would**: a fresh folder (`<folder>/check`), Node.js off
  the PATH: the setup run (the host booted, its runtime started, the
  preloaded `service initialise /` run), then a cycle of requests (`start
  /`, a `put` into `main` and its `get`, `get /`, `stop /`, `shutdown /`,
  the runtime ending); nothing left running.
- **With `--push` only**: the setup and the manifest published as the latest
  release of `haiccing/base-package-boot`, tagged `setup-<12 hex>` from the
  packages' identities (the same packages, the same tag: published once).

## 2. Check it from GitHub, as a user would

In a new folder, Node.js off the PATH:

```bash
curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-boot/releases/latest/download/haicc-setup.sh
sh haicc-setup.sh ~/haicc-work
B=~/haicc-work/mrepos/host/packages/haiccing/base-package-haicc.bundle
~/haicc-work/setup/bare $B start /
~/haicc-work/setup/bare $B get /
~/haicc-work/setup/bare $B shutdown /
```

## 3. Record it

In the step's folder (`steps/<step>/local-run.md`): the commit, the tag, the
commands, each result, what was not checked, and findings for the
implementer (not fixed there). Commit on `execute/main`, merge into `main`,
push both.

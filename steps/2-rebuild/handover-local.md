# For the local agent: the first release of the rebuilt platform

Written 2026-11-09 by the cloud session, for the local agent (a Linux x86-64
machine with Docker not needed yet, git and curl (no Node.js needed), and `gh` authenticated with push access to github.com/haiccing). The
human's word is needed before step 4 (publishing).

What this release is: the first thin path of step 2 (`readme.md` here). From
one downloaded file, `haicc-setup.sh` (about 29 MB: Bare, two bundles,
their native addons by hash, the publisher's signed manifest), a work folder
is booted into a mycelium repository: the boot loads the manifest, checks
the publisher's signature, loads the boot's and HAICC's packages (each
checked by hash), creates the repository with its six layers, installs the
packages into its `packages` layer and deploys HAICC. `haicc status` and
`haicc read <uri>` show it. Nothing runs after the boot yet (no swarm, no
Docker: those come later).

## 1. The development repository

```sh
git clone https://github.com/splectrum/splectrum-dev-env-3-mycelium.git && cd splectrum-dev-env-3-mycelium
git checkout execute/main
sh tools/install.sh
```

## 2. The publisher's key (once)

```sh
tools/bare tools/setup/keygen.js ~/haicc-publisher
```

`~/haicc-publisher/publisher.secret` signs every release: keep it on this
machine only, never in a repository, never printed; back it up (a lost key
means a new key in every setup after). `publisher.public` goes into every
setup. The keygen never overwrites an existing key.

## 3. Build and check, not published

```sh
sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher"
```

It writes the two packages from the commit checked out (signed), builds
`~/haicc-release/out/haicc-setup.sh`, then checks it as a user would: a fresh
folder (`~/haicc-release/check`), Node.js off the PATH, the setup run, then
`haicc status`. Expect, last: a level with the layers `/execute/main`,
`/main`, `/packages`, `/request/done`, `/request/executing`,
`/request/pending/default`; the manifest signed; two packages,
`haiccing/base-package-boot` and `haiccing/base-package-haicc` (deployed);
then `not published (setup-<12 hex>)`.

Look around, by hand, in the checked folder:

```sh
B=~/haicc-release/check/haicc/packages/haiccing/base-package-haicc.bundle
~/haicc-release/check/setup/bare $B status
~/haicc-release/check/setup/bare $B read /
~/haicc-release/check/setup/bare $B read /packages
~/haicc-release/check/setup/bare $B read /packages/manifest.json
```

## 4. Publish, with the human's word

The repository `haiccing/base-package-boot` must exist (created by the human).

```sh
sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher" --push
```

It does 1 to 3 again, then publishes the setup and the manifest as the
release `setup-<12 hex>` of `haiccing/base-package-boot` (latest).

## 5. Check it from GitHub, as a user would

In a new folder, Node.js off the PATH:

```sh
curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-boot/releases/latest/download/haicc-setup.sh
sh haicc-setup.sh ~/haicc-work
~/haicc-work/setup/bare ~/haicc-work/haicc/packages/haiccing/base-package-haicc.bundle status
```

## 6. Record it

In `steps/2-rebuild/local-run.md`: the commit, the tag, the commands, each
result (paste `haicc status`), how long the setup and the boot took, what
was not checked, and anything found (for the implementer, not fixed there).
Commit, push to `execute/main`.

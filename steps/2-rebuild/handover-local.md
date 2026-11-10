# For the local agent: building, testing and publishing a release

Updated 2026-11-10 by the cloud session (the first release, 2026-11-09, is in
`local-run.md`), for the local agent (a Linux x86-64 machine with git and
curl (no Node.js needed), and `gh` authenticated with push access to
github.com/haiccing). Publishing (section 4) is on the human's word.

What this release is: the thin path of step 2 to part 6 (`readme.md` here).
From one downloaded file, `haicc-setup.sh` (Bare fetched and checked by the
setup; three bundles: the boot, HAICC, the mrepo framework; their native
addons by hash; the publisher's signed manifest), a work folder is booted
into the host's repository, `host`, of type `haicc`: its layers (`main`,
`packages`, `runtime` in the Corestore; `inbox`, `outbox`, `request/*` and
the execution branches in git on disk, `mrepos/host/.git`), its packages installed, the
runtime started, which runs the preloaded `service initialise /`. Then every
`haicc` command is a request: posted to `/inbox`, queued, executed, merged,
recorded in `request/done`, answered.

## 1. The development repository

```sh
git clone https://github.com/splectrum/splectrum-dev-env-3-mycelium.git && cd splectrum-dev-env-3-mycelium
git checkout main
sh tools/install.sh
```

## 2. The publisher's key (made once, kept)

`~/haicc-publisher/publisher.secret` signs every release: on this machine
only, never in a repository, never printed; backed up. Made for the first
release (`tools/bare tools/setup/keygen.js ~/haicc-publisher`, which never
overwrites an existing key); a new key would mean a new key in every setup.

## 3. Build and check, not published

```sh
sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher"
```

It writes the three packages from the commit checked out (signed, each
package's tests run first), builds `~/haicc-release/out/haicc-setup.sh`, then
checks it as a user would: a fresh folder (`~/haicc-release/check`),
Node.js off the PATH, the setup run (the boot; the runtime started), then
the cycle, each printing its completed form (a record: the request with
its `output`): `start /` (`"service": "started"`),
`put /main/notes/hello.json`, `get /main/notes/hello.json` (`"text":
"hello"`), `get /` (the repository `host`, `"service": "started"`, its eight
layers, three packages), `stop /`, `shutdown /`; then "the cycle: answered;
shut down, the runtime ended" and `not published (setup-<12 hex>)`.

By hand, in the checked folder (the runtime started again by the first
request, ended by `shutdown /`):

```sh
B=~/haicc-release/check/mrepos/host/packages/haiccing/base-package-haicc.bundle
~/haicc-release/check/setup/bare $B initialise /
~/haicc-release/check/setup/bare $B start /
~/haicc-release/check/setup/bare $B get /
~/haicc-release/check/setup/bare $B get /request/done
~/haicc-release/check/setup/bare $B get /runtime/api.json
~/haicc-release/check/setup/bare $B put /main/x.json '{"a":1}'
~/haicc-release/check/setup/bare $B put /packages/x.json 1      # refused: not offered
~/haicc-release/check/setup/bare $B stop /
~/haicc-release/check/setup/bare $B shutdown /
cat ~/haicc-release/check/log/runtime.log
```

## 4. Publish, with the human's word

```sh
sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher" --push
```

It does 1 to 3 again, then publishes the setup and the manifest as the
release `setup-<12 hex>` of `haiccing/base-package-boot` (latest). The tag
comes from the packages' identities: the same packages, the same tag
(published once).

## 5. Check it from GitHub, as a user would

In a new folder, Node.js off the PATH:

```sh
curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-boot/releases/latest/download/haicc-setup.sh
sh haicc-setup.sh ~/haicc-work
B=~/haicc-work/mrepos/host/packages/haiccing/base-package-haicc.bundle
~/haicc-work/setup/bare $B start /
~/haicc-work/setup/bare $B put /main/notes/hello.json '{"text":"hello"}'
~/haicc-work/setup/bare $B get /main/notes/hello.json
~/haicc-work/setup/bare $B get /
~/haicc-work/setup/bare $B stop /
~/haicc-work/setup/bare $B shutdown /
```

## 6. Record it

In `steps/2-rebuild/local-run.md`, a new section: the commit, the tag, the
commands, each result, how long the setup and the boot took, what was not
checked, and anything found (for the implementer, not fixed there). Commit
on `execute/main`, merge into `main`, push both.

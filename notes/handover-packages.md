# Handover: publishing the haiccing packages (for the local agent)

**Done 2026-11-05**, both tasks: `steps/phase-3/1-packages-and-boot/5-validation/local-run.md`.

Written 2026-11-04 after phase 3, step 1; updated the same day. The cloud
session published the six packages (`haiccing/base-package-haicc`, `-pkgm`,
`-third-party`, `-mycelium`, `-p2p`, `-splectral`), each equal to what it
wrote and tested here, its GitHub archive checked identical (exec bits
included). It cannot push the two demo projects: a session checks out
repositories by name only, and `splectral/base-demo-liveness` and
`-other-host` already hold those names there. So two tasks are the local
agent's.

## 1. Publish the two demo projects

`haiccing/base-demo-liveness` and `haiccing/base-demo-other-host`, now
packages too (their project, their Splectral component, `run.sh`), written
by the package manager from this repository. On the local machine, in this
repository at `main`, Linux x86-64 (in WSL2, inside the distribution):

```sh
git pull
npm install
sh steps/phase-3/1-packages-and-boot/5-validation/publish.sh ~/haiccing-publish
```

It clones the eight repositories, writes them (tested together first:
nothing is written if a test fails), commits what changed and pushes. The
six packages show `unchanged`; only the two demos are committed ("Written by
the package manager from dev-env-2-p2p-cluster <commit> (hash <hash>)",
their LICENSE kept). `--no-push` looks first.

## 2. From scratch, against GitHub

The one check the session leaves to this side: the repositories as anyone
gets them, GitHub's archives, on a clean home (`HOME=$(mktemp -d)` keeps it
apart from your own `~/.haicc`):

```sh
mkdir -p ~/haiccing-scratch && cd ~/haiccing-scratch
for r in base-demo-liveness base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral; do
  curl -fsSL https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz | tar -xz && mv $r-main $r
done
sh base-demo-liveness/run.sh
```

Then Run (and Run again) on the scenario's page, `~/.haicc/bin/haicc test
base-demo-liveness`, `~/.haicc/bin/haicc teardown base-demo-liveness`; the
same for `base-demo-other-host` if time allows. Record what happens in
`steps/phase-3/1-packages-and-boot/5-validation/local-run.md`, commit and
push.

- `base-package-third-party` is about 144 MB (Bare's runtime one 97 MB
  file): its archive is the slow one.
- Step 0 asks before fixing anything on the host; on a machine with
  everything, it only checks.

## Again, after part 6 (2026-11-05): the work folder

Part 6 (`steps/phase-3/1-packages-and-boot/6-work-folder/`) changed
`base-package-haicc` and `-pkgm` (pushed from the session) and the two
demos (theirs: no `run.sh` any more, readmes for the work folder). And
there is a setup now, `haicc-setup.sh`, base-package-haicc's release.

1. **Publish**, as before: `publish.sh ~/haiccing-publish`. It pushes the two
   demos (their latest from `main`, part 7's fix in the packages under them), then builds the setup and, with `gh` there, publishes it as a
   GitHub release of `haiccing/base-package-haicc` (tag `setup-<hash>`);
   without `gh`, say so and upload `~/haiccing-publish/haicc-setup.sh` by
   hand.
2. **A work folder from scratch**, the new route (no development
   repository; a clean folder, nothing in `$HOME`):

   ```sh
   curl -fsSL -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
   sh haicc-setup.sh ~/haicc-work
   ~/haicc-work/haiccing/boot
   cd ~/haicc-work && ./haicc run base-demo-liveness
   ```

   Run and Run again on the page; `./haicc test base-demo-liveness`,
   `./haicc teardown base-demo-liveness`. Or the whole self-test at once:
   copy `haiccing/base-package-haicc/pear-full-square/haicc-base-boot/selftest.install`
   to `haiccing/install` before `haiccing/boot`. Record it in
   `6-work-folder/local-run.md`, with the logs of `.haicc/log/`.

For the human: `pear-full-square/pkgm-base-boot` is retired (the
package manager has no boot of its own now): archive it on GitHub.

Part 7 (a node's shutdown, `7-shutdown/`) fixes finding 1 of the first local
run: worth Run and Run again a few times on the liveness demo in the new
work folder, to see it hold on this machine too.

## The organisations' profiles (2026-11-06)

**Done 2026-11-06** by the local agent: all five pushed and shown on their
organisations' pages (`splectrum` `c524388`, `bare-for-pear` `98d4528`,
`pear-full-square` `ca3f0c2`, `splectral` `700dd04`, `haiccing` `72726ee`).
The setup's link in `haiccing`'s profile is 404 until the release is
published ("Again, after part 6"): check it then.

Five profiles, drafted and agreed with the human: what each organisation is
for, where to start. Each in this repository at
`<org>/.github/profile/README.md`, for the repository `<org>/.github`
(all five exist): `splectrum`, `bare-for-pear`, `pear-full-square`,
`splectral`, `haiccing`. The cloud session cannot push them (five
repositories of one name cannot share a session).

For each: clone `https://github.com/<org>/.github`, copy the file to
`profile/README.md` there (replacing the old one where there is one), commit
("The organisation's profile: what it is for, where to start"), push. Check
each organisation's page on GitHub shows it.

`haiccing`'s profile starts with downloading the setup from
`base-package-haicc`'s latest release: publish that release first (above,
"Again, after part 6"), or check the link once it is there.

## The release, and the demos again (2026-11-06)

The root boot is built: `base-package-haicc` (`90fe587`) carries it, and
the setup is built from it (`haicc-setup.sh`, 34 KB, hash `96cfc58bc18f`).
To do, in this order:
1. **The demos**: `publish.sh ~/haiccing-publish` pushes the two demos (the
   six packages show unchanged), then builds the setup.
2. **The release**: done by the human (2026-11-06), `setup-96cfc58bc18f`,
   marked latest; its download link checked, the file identical to the one
   built. Was: the release of `haiccing/base-package-haicc`, the setup attached
   (`gh release create`, as `publish.sh` does with `gh`; or by hand: Releases,
   "Draft a new release", tag `setup-96cfc58bc18f`, attach
   `haicc-setup.sh`, mark latest).
3. **The route from it**, on a clean work folder, and record it in
   `6-work-folder/local-run.md` with `.haicc/log/haicc.log`:

   ```sh
   curl -fsSL -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
   sh haicc-setup.sh ~/haicc-work
   ~/haicc-work/haiccing/boot
   cd ~/haicc-work && ./haicc list
   ```

   The root only, for now: the manager boot (and so running a demo) is the
   next step. Then check `haiccing`'s profile's link works.

   **Done 2026-11-06** by the local agent, on the human's word without the
   demos (step 1 not done): `6-work-folder/local-run.md`. The link works.
   The second release, `setup-58fb397be615`, carries its fixes; the profile
   is trimmed.

## The fixes after the third release (2026-11-06)

**Items 1 to 4 done 2026-11-06** by the local agent, the release with the
human's OK: `setup-47f2b29b0194`, recorded in `5-validation/products.md` and
`6-work-folder/local-run.md`. Item 5 is the human's.

On `main` (the session's commits up to "Testing decided; the environment
copies removed"): the human's findings 4 to 7 and no hidden folders, the
boot 0.5.0. Not published. In this order:

1. **The packages**: `publish.sh ~/haiccing-publish` (from this repository
   at `main`, `npm install` done). All eight change: `base-package-haicc`
   (the boot 0.5.0, its readme: one command, `curl` retrying, where the log
   is), `-pkgm` (`pkgm/` for the registry), `-p2p` (`haicc-owner`, the image
   build skipping `pkgm/`), the rest by their readmes; the demos too (they
   were behind).
2. **The products**, merged as before (a split of each, merged, each equal
   to its folder but for its LICENSE): `haicc-base-boot`, `haicc-reconcile`,
   `haicc-deployment`, `pkgm-base-manager`, `p2p-swarm-manager`,
   `p2p-node-manager`. Recorded in `5-validation/products.md`.
3. **The setup**: `publish.sh` builds it (`~/haiccing-publish/haicc-setup.sh`);
   released only with the human's OK (tag `setup-<hash>`, latest), stored
   nowhere else.
4. **`haiccing`'s profile** (`haiccing/.github/profile/README.md` here):
   one command, `curl` retrying, where the log is. Pushed to `haiccing/.github`.
5. **The human tests locally**, from the release, a new folder:
   - the one command from the profile; a failed download stops it;
   - nothing hidden in the work folder: `install/`, `log/`, `haiccing/`,
     `haicc`;
   - `log/haicc.log` from the setup's first line on (the setup's header and
     result, then the boot's stages);
   - the setup again over the same folder: `already set up with this
     setup`, exit 0; an older setup's folder: both named, a new folder said,
     exit 1;
   - a boot without Node.js, through to the end, on a good connection (not
     yet seen).
   Recorded in `6-work-folder/local-run.md`: the log kept, nothing of the
   work folder.

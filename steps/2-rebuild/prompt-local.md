# Prompt for the local agent

Give this to Claude Code on the local machine (Linux x86-64; git, curl,
tar). Nothing is published: no GitHub release, no push of the build; only
its note is committed.

> Build the release of `base-package-boot` into the local sources, with its
> prerequisites, so the human can run it from the command line.
>
> 1. **Update the clone.** In your clone of
>    https://github.com/splectrum/splectrum-dev-env-3-mycelium (no clone
>    yet: clone it first), check out `main` and pull.
> 2. **Install the dependencies.** `sh tools/install.sh` (no Node.js or npm
>    needed: it replays `package-lock.json` with curl and tar; this time it
>    adds `bare-build`, this platform's only, about 46 MB). Then check that both exist:
>    `node_modules/bare-runtime-linux-x64/bin/bare` and
>    `node_modules/.bin/bare-build`.
> 3. **Build the release into the local sources.** From the clone's folder:
>    `tools/bare tools/boot-release.js`. It writes into `sources/`
>    (gitignored, never committed):
>    - `sources/haiccing/base-package-boot-linux-x64`: the release, a
>      standalone executable (Bare built in); beside it its `.json` (the
>      platform, the Bare version, the commit, how to run it);
>    - `sources/haiccing/base-package-runtime.bundle`,
>      `sources/haiccing/base-package-boot.bundle` and
>      `sources/haiccing/manifest.json`: the packages the boot mrepo lists
>      (the runtime, the boot protocol);
>    - `sources/addons/<sha256>`: its native addons;
>    - `sources/holepunchto/bare-runtime-linux-x64-<version>.tgz`: the
>      prerequisite Bare, the version built into the executable, fetched
>      from npm's registry with curl and pinned by its sha512.
> 4. **Check it once, with the try test**, from the clone's folder:
>    `HAICC_DEV="$PWD" HOME=/tmp/boot-check-home sh tools/haicc-try.sh --yes`
>    (make `/tmp/boot-check-home` first; remove it after). It is a test
>    that ends by itself: the boot run in `<HOME>/haicc-try`, its records
>    followed one a line until every request is done (the boot's
>    `boot deploy /boot`, then its runtime's preloaded `boot deploy /host`:
>    the host built inside it, `mrepos/boot/main/host/`, its runtime
>    started), what was left shown, the runtimes stopped, the folder
>    removed. Exit code 0 and `== passed: every request done`; not in time:
>    exit 4. If a Bare is installed on the PATH at the pinned major (the
>    same version or newer), it is used (the binary it runs recorded);
>    else the pinned one is put in place.
> 5. **Put the try test in the home folder**: copy `tools/haicc-try.sh` to
>    `~/haicc-try.sh` (executable). It finds the clone at
>    `~/splectrum-dev-env-3-mycelium`; if yours is elsewhere, tell the human
>    to run it as `HAICC_DEV=<clone> ~/haicc-try.sh`.
> 6. **Tell the human** that the release is ready: the path of
>    `sources/haiccing/base-package-boot-linux-x64`, the Bare version (from
>    its `.json`), the output of step 4 (or what failed and how), and the
>    command to try it: `~/haicc-try.sh` (it ends by itself, its exit code
>    passed or failed; it asks before putting Bare in place, `--yes` does
>    not; `--pause` waits for a key before cleaning up, to inspect).
>
> 7. **Write a note back**: what ran, each result, anything that did not
>    run as written and why (with a proposal and a patch if you have one,
>    as before), in `steps/2-rebuild/local-note.md`: a new section at the
>    top, dated, naming the commit you tested. Commit only that file on
>    `execute/main`, merge it into `main` (a plain merge), push both.
>
> Do not change the code: report, and propose.

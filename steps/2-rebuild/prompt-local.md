# Prompt for the local agent

Give this to Claude Code on the local machine (Linux x86-64; git, curl,
tar). Nothing is published: no GitHub release, no push of the build.

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
>    - `sources/haiccing/base-package-runtime.bundle` and
>      `sources/haiccing/manifest.json`: the package the boot mrepo lists;
>    - `sources/addons/<sha256>`: its native addons;
>    - `sources/holepunchto/bare-runtime-linux-x64-<version>.tgz`: the
>      prerequisite Bare, the version built into the executable, fetched
>      from npm's registry with curl and pinned by its sha512.
> 4. **Check it once**, from the clone's folder, in a fresh work folder:
>    `sources/haiccing/base-package-boot-linux-x64 --work=/tmp/boot-check --sources=folder:sources --yes`.
>    It prints the request `boot deploy /boot` (its `output` lists the steps
>    `prerequisites`, `built`, `packages`), then the status of the boot
>    mrepo's runtime, which it starts. Exit code 0. Within a few seconds that
>    runtime deploys the host inside the boot mrepo:
>    `/tmp/boot-check/mrepos/boot/main/host/` appears, and two runtime
>    processes run (`pgrep -af /tmp/boot-check/`). Then stop them,
>    `pkill -TERM -f /tmp/boot-check/` (wait until `pgrep` finds none), and
>    remove `/tmp/boot-check`.
> 5. **Put the try script in the home folder**: copy
>    `tools/haicc-try.sh` to `~/haicc-try.sh` (executable). It runs the
>    release from `~` with `~/haicc-try` as its work folder, saves the
>    printed record there as `boot-output.json`, shows the boot mrepo, the
>    host inside it and their runtimes, stops on `press any key to clean
>    up`, then stops the runtimes and removes `~/haicc-try` (also on
>    Ctrl-C). It finds the clone at `~/splectrum-dev-env-3-mycelium`; if
>    yours is elsewhere, tell the human to run it as
>    `HAICC_DEV=<clone> ~/haicc-try.sh`.
> 6. **Tell the human** that the release is ready: the path of
>    `sources/haiccing/base-package-boot-linux-x64`, the Bare version (from
>    its `.json`), the output of step 4 (or what failed and how), and the
>    command to try it: `~/haicc-try.sh` (it asks before putting Bare in
>    place; `~/haicc-try.sh --yes` does not ask).
>
> Nothing to commit. Do not change the code: if something fails, report it.

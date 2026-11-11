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
>    adds `bare-build`, about 1 GB). Then check that both exist:
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
>    It prints one record, the request `boot deploy /boot`: its `output`
>    lists the steps `prerequisites`, `built`, `packages`, and `next`, the
>    command that would start the runtime (not started by the boot). Exit
>    code 0. Then remove `/tmp/boot-check`.
> 5. **Tell the human** that the release is ready: the path of
>    `sources/haiccing/base-package-boot-linux-x64`, the Bare version (from
>    its `.json`), and the output of step 4, or what failed and how.
>
> Nothing to commit. Do not change the code: if something fails, report it.

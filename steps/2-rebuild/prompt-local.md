# Prompt for the local agent

Give this to Claude Code on the local machine (Linux x86-64; git, curl,
tar; `gh` for a release). Nothing is signed. The sources are built
locally and used locally; a release is created only when the human asks.
Only its note is committed.

> Build the sources locally and test the `haicc` command end to end, so the
> human can then use it from the command line.
>
> 1. **Update the clone.** In your clone of
>    https://github.com/splectrum/splectrum-dev-env-3-mycelium (no clone
>    yet: clone it first), check out `main` and pull.
> 2. **Install the dependencies.** `sh tools/install.sh` (no Node.js or npm
>    needed: it replays `package-lock.json` with curl and tar). Then check
>    that `node_modules/bare-runtime-linux-x64/bin/bare` exists.
> 3. **Build the sources.** From the clone's folder:
>    `tools/bare tools/release.js`. It writes into `sources/` (gitignored,
>    never committed): every package's bundle and their manifest
>    (`sources/haiccing/`), their native addons (`sources/addons/`), and
>    Bare's tarball as the lockfile pins it (`sources/holepunchto/`,
>    fetched once with curl, checked against its sha512). It also writes
>    the installer again, `haiccing/base-linux-haicc/haicc-install.sh`;
>    `git status` must show no change after it (if it does, say so in your
>    note and do not commit it).
> 4. **Run the test of the `haicc` command**, from the clone's folder:
>    `sh haiccing/base-linux-haicc/test/run.sh`. It works in a temporary
>    folder and ends by itself: the installer, the sources linked, Bare put
>    in place, the boot, the host deployed from `base-component-haicc`, its
>    service started, a node deployed inside it, commands chained through
>    both, the teardowns. One line a check; the last lines say
>    `# checks = <n>/<n> pass` and `# ok`; exit 0 passed, 1 failed. It
>    leaves nothing running: check with `pgrep -fa "bin/bare"`.
> 5. **Run the packages' own tests**, each from its bundle, from the clone's
>    folder, for each of `base-package-runtime`, `base-package-boot`,
>    `base-package-service`, `base-package-haicc`, `base-component-haicc`,
>    `package-docs-mrepo`, `package-docs-template`:
>    `SOURCES=$PWD/sources tools/bare sources/haiccing/<package>.bundle /test/full`
>    (exit 0 passed; the boot package's takes a few minutes).
> 6. **Install it for the human**, in their home folder:
>    `sh haiccing/base-linux-haicc/haicc-install.sh` (it puts the scripts in
>    `~/.haicc` and registers `haicc` in `/usr/local/bin` when that can be
>    written, else in `~/.local/bin`; it says if that folder is not on the
>    PATH). Then `haicc sources link "$PWD/sources"` and `haicc prereq`.
>    Do not run `haicc boot/deploy`: that is the human's.
> 7. **Tell the human** it is ready: what steps 4 and 5 printed last (or
>    what failed and how), where `haicc` was registered, and the commands
>    to try, in this order:
>    `haicc boot/deploy`, `haicc / boot/deploy host base-component-haicc`,
>    `haicc /host service/initialise`, `haicc /host service/start`,
>    `haicc /host help/get /`; and to undo: `haicc / boot/teardown host`,
>    then `haicc boot/teardown`. The boot mrepo's runtime keeps running
>    after `haicc boot/deploy`; its work folder is `~/.haicc/work`. A
>    command prints its response record whole, unpacked across lines;
>    `haicc --raw ...` as it is stored, one line; `haicc --output ...` the
>    output alone. `haicc --help` lists the commands.
> 8. **Write a note back**: what ran, each result, anything that did not
>    run as written and why (with a proposal and a patch if you have one,
>    as before), in `steps/2-rebuild/local-note.md`: a new section at the
>    top, dated, naming the commit you tested. Commit only that file on
>    `execute/main`, merge it into `main` (a plain merge), push both.
>
> Do not change the code: report, and propose. Do not create a release
> unless the human asks: how, when they do, is in
> `steps/2-rebuild/handover-local.md`, "Releases".

# From the local agent

Notes from the local machine (Linux x86-64, WSL2), newest first, each
following `prompt-local.md`. Offline (the connection poor): every download
kept in a local source, `~/haicc-mirror/` since 2026-11-13 (before:
`~/haicc-release/sources/`; npm's tarballs by URL, a `curl` that serves
them, git URLs to local mirrors), so `tools/install.sh` and
`tools/release.js` run with no network.

## 2026-11-13: `381bbae`

The prompt ran as written, every step passed, nothing downloaded. Then the
human tried `haicc` by hand: four findings (1 to 4), one with a tested
patch. The code not changed here.

Cleaned up first, on the human's word: the old releases' leftovers (the
setup file, the executable, `haicc-try.sh`, the old work folders, the old
`~/.haicc`, `/tmp/haicc-*`, the signed publish of 2026-11-08, Bare
1.35.0); the local source moved to `~/haicc-mirror/`.

| Step | Result |
|---|---|
| 2. `sh tools/install.sh` (from a clean `node_modules/`) | exit 0, 10 s: 236 fetched (from the local source), 1 kept, 18 linked; Bare v1.36.0 there |
| 3. `tools/bare tools/release.js` | exit 0, 11 s: the seven bundles, the manifest, the addons, `third-party.json`, from `381bbae`, Bare v1.36.0; `git status` clean (the installer as `build.sh` writes it) |
| 4. `sh haiccing/base-linux-haicc/test/run.sh` | exit 0, 30 s: `# checks = 66/66 pass`, `# ok`; nothing left running |
| 5. the packages' `/test/full` | all `# ok`, exit 0: `base-package-runtime` 76 s, `base-package-boot` 162 s, `base-package-service`, `base-package-haicc`, `base-component-haicc` 3 s each, `package-docs-mrepo`, `package-docs-template` 1 s each; nothing left running |
| 6. `haicc-install.sh`, sources, `haicc prereq` | `/usr/local/bin/haicc`, its folder `~/.haicc`; see below for the sources; `prereq`: all ok, Bare 1.36.0 put in place |

On step 6, one difference, the human's choice: the sources tested were
copied into haicc's own sources folder, `~/.haicc/sources/` (identical,
`diff -r`), and that folder linked, not the clone's `sources/`: the next
build then does not change what the human runs. A local publish, before a
release.

Two smaller things seen:

- `package-lock.json` still has `bare-build` (a dev dependency, about
  46 MB with this platform's prebuilt) and `tools/install.sh` still
  installs it; nothing uses it since `tools/boot-release.js` went.
  Proposal: drop it from `package.json` and the lockfile.
- `tools/release.js` reports, for `base-package-runtime` and
  `base-package-boot`, `"unresolved":["pear-full-square/p2p-mrepo:
  from-native", "...: from-bundle", "...: a"]`. No test failed on it; said
  in case it is not known.

### 1. `haicc`: the response record by default, the output as the option

The human: the response printed should be the raw record (the
Kafka-style record, as it is in the outbox folder), not an extract; the
extract only on request. Today it is the other way round
(`HAICC_RECORD=1` for the record).

Proposal: `haicc <URI> ...` prints the response record whole, the exit
code still from its completed form (0 an output, 1 an error, the error
also on stderr); `haicc --output <URI> ...` (or `HAICC_OUTPUT=1`) the
output alone, as now; `HAICC_RECORD` dropped. In the test: the exact
comparisons use `--output`, the two error checks read stderr alone (which
also checks the record goes to stdout, the error to stderr), five checks
added. Tested on a worktree of `381bbae` (`sh build.sh`, then the test):
`# checks = 71/71 pass`, `# ok`. The patch (then `sh build.sh` for
`haicc-install.sh`):

```diff
diff --git a/haiccing/base-linux-haicc/README.md b/haiccing/base-linux-haicc/README.md
--- a/haiccing/base-linux-haicc/README.md
+++ b/haiccing/base-linux-haicc/README.md
@@ -66,7 +66,11 @@ go as typed, unnamed; the mrepo interprets them.
 
 - `HAICC_TIMEOUT`: seconds to wait for the response, 120; none in time:
   exit 4, and the request stays.
-- `HAICC_RECORD=1`: the whole response record printed.
+- The response record is printed whole, as it is in the outbox folder;
+  the exit code from its completed form: 0 an output, 1 an error (also
+  said on stderr).
+- `haicc --output <URI> ...` (or `HAICC_OUTPUT=1`): the completed form's
+  output alone printed, not the record.
 
 ## Folders
 
diff --git a/haiccing/base-linux-haicc/bin/haicc b/haiccing/base-linux-haicc/bin/haicc
--- a/haiccing/base-linux-haicc/bin/haicc
+++ b/haiccing/base-linux-haicc/bin/haicc
@@ -1,6 +1,7 @@
 #!/bin/sh
 # haicc: the command. It only dispatches.
-#   haicc <URI> <protocol>/<action> <argument>...   an mrepo command: a URI
+#   haicc [--output] <URI> <protocol>/<action> <argument>...   an mrepo
+#       command (--output: the completed form's output alone): a URI
 #       starts with / (the local root), so a first part starting with / is a
 #       command for the mrepos; it goes to the boot mrepo's inbox
 #       (haicc-request)
@@ -16,7 +17,10 @@ usage () {
 haicc <URI> <protocol>/<action> <argument>...   a command for the mrepos:
                                                 go to this node position and
                                                 execute the command that
-                                                follows
+                                                follows; its response record
+                                                printed whole
+haicc --output <URI> <protocol>/<action> ...    the same, the completed
+                                                form's output alone
 haicc sources                                   the sources registered
 haicc sources link <folder>                     a local folder linked as a source
 haicc sources unlink <folder>
@@ -35,6 +39,9 @@ USAGE
 
 case "${1:-}" in
   /*) exec sh "$here/haicc-request" "$@" ;;
+  --output) shift; HAICC_OUTPUT=1; export HAICC_OUTPUT
+    case "${1:-}" in /*) exec sh "$here/haicc-request" "$@" ;; esac
+    echo "haicc: --output goes before a URI" >&2; exit 2 ;;
   ''|help|--help|-h) usage; exit 0 ;;
 esac
 name=$1; shift
diff --git a/haiccing/base-linux-haicc/bin/haicc-request b/haiccing/base-linux-haicc/bin/haicc-request
--- a/haiccing/base-linux-haicc/bin/haicc-request
+++ b/haiccing/base-linux-haicc/bin/haicc-request
@@ -11,10 +11,12 @@
 #                  resolves the position:
 #                    haicc /host service/start    ->  haicc /host service/start
 # The parts go as typed, unnamed; the mrepo interprets them.
-# Prints the command's output (JSON) and exits 0; its error on stderr, exit 1.
+# Prints the response record whole, as it is in the outbox folder; exit 0
+# when its completed form holds an output, 1 an error (also said on stderr).
 #   HAICC_TIMEOUT   seconds to wait for the response (120); none in time:
 #                   exit 4 (the request stays; its key is said)
-#   HAICC_RECORD=1  the whole response record printed, not its output alone
+#   HAICC_OUTPUT=1  the completed form's output alone printed, not the
+#                   record (haicc --output)
 set -u
 . "$(dirname "$0")/haicc-lib.sh"
 [ $# -ge 2 ] || fail "haicc <URI> <protocol>/<action> <argument>... (a command follows the URI)" 2
@@ -57,5 +59,5 @@ while [ ! -f "$back" ]; do
   sleep 0.2 2>/dev/null || sleep 1
   waited=$((waited + 1))
 done
-if [ "${HAICC_RECORD:-}" = 1 ]; then cat "$back"; fi
-awk -f "$(dirname "$0")/haicc-response.awk" -v quiet="${HAICC_RECORD:-}" "$back"
+if [ "${HAICC_OUTPUT:-}" = 1 ]; then quiet=''; else quiet=1; cat "$back"; fi
+awk -f "$(dirname "$0")/haicc-response.awk" -v quiet="$quiet" "$back"
diff --git a/haiccing/base-linux-haicc/test/run.sh b/haiccing/base-linux-haicc/test/run.sh
--- a/haiccing/base-linux-haicc/test/run.sh
+++ b/haiccing/base-linux-haicc/test/run.sh
@@ -47,7 +47,7 @@ out=$(sh "$pkg/haicc-install.sh" --home="$T/home" --bin="$T/bin" 2>&1)
 is $? 0 "installed: sh haicc-install.sh --home --bin"
 [ -x "$T/bin/haicc" ] && [ -f "$T/home/pins" ] && ok "the command registered in the bin folder, its scripts and pins in its own" || no "the command registered" "$out"
 PATH=$T/bin:$PATH; export PATH
-unset HAICC_HOME HAICC_WORK HAICC_RECORD 2>/dev/null
+unset HAICC_HOME HAICC_WORK HAICC_OUTPUT 2>/dev/null
 HAICC_TIMEOUT=180; export HAICC_TIMEOUT
 
 # 2. the dispatcher
@@ -99,12 +99,12 @@ is "$(running | wc -l | tr -d ' ')" 1 "one runtime running: the boot mrepo's"
 # 7. commands: the host deployed at the root; passed through to it
 out=$(haicc / boot/deploy host base-component-haicc 2>&1); is $? 0 "haicc / boot/deploy host base-component-haicc"
 has "$out" '"deployed":"/host","mrepo":"local/host","package":"haiccing/base-component-haicc"' "its output: the haicc mrepo deployed at /host, its unique URI local/host"
-out=$(haicc / boot/deploy host base-component-haicc 2>&1); is $? 1 "deployed again: exit 1"
+out=$(haicc / boot/deploy host base-component-haicc 2>&1 >/dev/null); is $? 1 "deployed again: exit 1"
 is "$out" "haicc: deployed already: /host" "its error on stderr: /host is there already"
-out=$(haicc /host boot/deploy node-1 base-package-runtime 2>&1); is $? 1 "the host booted: its boot protocol behind the service's door"
+out=$(haicc /host boot/deploy node-1 base-package-runtime 2>&1 >/dev/null); is $? 1 "the host booted: its boot protocol behind the service's door"
 is "$out" "haicc: not now: boot deploy (the service is booted, not started)" "said"
-is "$(haicc /host service/initialise 2>&1)" '{"service":"initialised"}' "haicc /host service/initialise: passed through to the haicc mrepo"
-is "$(haicc /host service/start 2>&1)" '{"service":"started"}' "haicc /host service/start"
+is "$(haicc --output /host service/initialise 2>&1)" '{"service":"initialised"}' "haicc /host service/initialise: passed through to the haicc mrepo"
+is "$(haicc --output /host service/start 2>&1)" '{"service":"started"}' "haicc /host service/start"
 
 # 8. a node inside the host; commands chained through both
 out=$(haicc /host boot/deploy node-1 base-package-runtime 2>&1); is $? 0 "haicc /host boot/deploy node-1: executed by the haicc mrepo"
@@ -118,12 +118,17 @@ out=$(haicc /host/node-1 help/get 2>&1); is $? 1 "a URI running through a shortc
 has "$out" "/host is a shortcut: a URI does not run through it" "said, with the way across"
 out=$(haicc / help/get /packages 'no "such" section' 2>&1); is $? 1 "an argument with spaces and quotes: sent whole"
 has "$out" 'no section "no "such" section" at /packages' "and back in the error"
-out=$(HAICC_RECORD=1 haicc /host help/get / oneliner 2>&1); is $? 0 "HAICC_RECORD=1: the whole record"
+out=$(haicc /host help/get / oneliner 2>&1); is $? 0 "by default: the whole record"
 has "$out" '"topic":"/haicc/terminal"' "printed: the core addressed back to the terminal"
+out=$(haicc --output /host help/get / oneliner 2>&1); is $? 0 "haicc --output: the output alone"
+case "$out" in *'"topic":'*) no "no record around it" "$out" ;; *) ok "no record around it" ;; esac
+out=$(HAICC_OUTPUT=1 haicc /host help/get / oneliner 2>&1); is $? 0 "HAICC_OUTPUT=1: the same"
+case "$out" in *'"topic":'*) no "no record around it, HAICC_OUTPUT=1" "$out" ;; *) ok "no record around it, HAICC_OUTPUT=1" ;; esac
+out=$(haicc --output 2>&1); is $? 2 "haicc --output without a URI: exit 2"
 
 # 9. torn down: the node, then the host
-is "$(haicc /host boot/teardown node-1 2>&1)" '{"tornDown":"/node-1"}' "haicc /host boot/teardown node-1"
-is "$(haicc / boot/teardown host 2>&1)" '{"tornDown":"/host"}' "haicc / boot/teardown host: at the root, about the shortcut as an item"
+is "$(haicc --output /host boot/teardown node-1 2>&1)" '{"tornDown":"/node-1"}' "haicc /host boot/teardown node-1"
+is "$(haicc --output / boot/teardown host 2>&1)" '{"tornDown":"/host"}' "haicc / boot/teardown host: at the root, about the shortcut as an item"
 [ ! -e "$T/home/work/mrepos/boot/main/host" ] && ok "the host's folder removed" || no "the host's folder removed"
 is "$(running | wc -l | tr -d ' ')" 1 "one runtime left: the boot mrepo's"
 
```

### 2. The service's responses say the state reached, not what was done

The human ran, after `initialise` and `start`:

| Command | Response | Expected |
|---|---|---|
| `haicc /host service/stop` | `{"service":"initialised"}` | stopped |
| `haicc /host service/shutdown` | `{"service":"booted"}` | shut down |

By design today: each action answers `moveTo(exec, <state>)`, the state
it moved to (`mrepo-base-service/external/stop/index.js`: `initialised`,
`shutdown/index.js`: `booted`; the machine booted -> initialised ->
started, and back). Read as an answer to "stop", "initialised" is wrong;
and the module describes itself otherwise (`internal/state.js`: "The
service state ...: initialised, started, stopped, shut down").

Proposal (to discuss with the human): the response says what was done,
and the state now beside it, nothing lost:
`initialise` `{"service":"initialised","state":"initialised"}`, `start`
`{"service":"started","state":"started"}`, `stop`
`{"service":"stopped","state":"initialised"}`, `shutdown`
`{"service":"shut down","state":"booted"}`. The description in
`state.js` made to match the machine.

### 3. Teardown: there, but not to be found

The human typed `haicc / deploy/teardown host` (twice): `no action: deploy
teardown`. The command is `haicc / boot/teardown host` (the test has it,
section 9). It is not among the commands `prompt-local.md` gives nor in
`haicc --help`, and `help/get deploy`, `help/get deploy/boot` answered
`no help at /deploy: nearest /`: nothing led to it.

Proposals: `haicc --help` and the prompt list the teardowns too
(`haicc /host boot/teardown <name>`, `haicc / boot/teardown host`); the
error for an unknown protocol says so, with the protocols there
(`no protocol: deploy (boot, help, service, ...)`), not `no action:
deploy teardown`; help reachable for a protocol and its actions from
where the human stands.

### 4. The machine level: `haicc boot/deploy`, `haicc boot/teardown`

The human: there is `haicc boot`, and no undo for it (today: `pkill -f
"bin/bare $HOME/.haicc/"` and `rm -rf ~/.haicc/work`, from the handover).
Proposed by the human, to conform: `haicc boot` becomes `haicc
boot/deploy`, and `haicc boot/teardown` is added. A command without a URI
is then the machine level, the root mrepo's parent, in the same
`<protocol>/<action>` form as every command below it.

The local agent's view, for the discussion: agreed. As teardown does not
cascade (known), `haicc boot/teardown` would take down the whole: every
runtime under the work folder stopped, the boot mrepo removed (the
handover's "start over", as one command). To settle with the human:
whether the package store goes with it, and whether the other script
commands (`sources`, `prereq`) take the same form.

### 5. A missing argument is not said: the target falls back to `/`

The human, on finding `boot/teardown`: it should have said "missing
argument target". The second part of a command is its target URI, and
when it is missing `mrepo-base-request/lib/command.js` makes it `/`
(`second === undefined ? '/'`): the action then runs on `/` and fails on
something else. Tried on a scratch `haicc` home (the human's left alone),
a boot mrepo only:

| `haicc / ...` | Says now | Should say |
|---|---|---|
| `boot/teardown` | `not a child to deploy: /` ("deploy", in a teardown) | missing argument: target |
| `boot/deploy` | `not a child to deploy: /` | missing argument: target |
| `boot/deploy host` | `no package to deploy /host from (its first argument)` | missing argument: package |
| `service/stop` (no service protocol in the boot mrepo) | `no action: service stop` | no protocol: service |

Proposal: an action's arguments named in its signature (as its README
has them: `teardown(exec, { uri })`), and checked before it runs: one
missing, `missing argument: <name>` (`target`, `package`). The human:
`/` is the mrepo itself, and one cannot deploy or tear down oneself; so
for `boot/deploy` and `boot/teardown` a target of `/` is still a missing
argument, left out or written (`haicc / boot/teardown /`): `missing
argument: target`, not an error about `/`. `/` stays a target where an
action takes the mrepo itself (`help/get`). An unknown protocol said as
such (with 3).

## 2026-11-12: `31501e6`

The prompt ran, with one stop in step 3 (1): on this clone
`tools/boot-release.js` failed until the three packages it bundles but
does not assemble were assembled by hand (`tools/package-assemble.js`, its
output gitignored; no code changed). Then everything as written. The code
not changed here; a patch for (1), tested on a fresh checkout, then taken
out.

| Step | Result |
|---|---|
| 2. `sh tools/install.sh` | exit 0: 237 kept, 3 linked, nothing to fetch; both files there |
| 3. `tools/bare tools/boot-release.js` | exit 134: `package-bundle.js haiccing/base-package-service`: `Cannot find module './modules/node_modules/bare-os/index.js'` (see 1) |
| 3, after `tools/package-assemble.js` for `base-package-service`, `package-docs-mrepo`, `package-docs-template` | exit 0: the release (117,644,552 bytes), Bare 1.35.0, the five bundles (`base-package-runtime`, `-boot`, `-service`, `package-docs-mrepo`, `-template`) and `manifest.json`; no tracked file changed |
| 4. `HAICC_DEV="$PWD" HOME=/tmp/boot-check-home sh tools/haicc-try.sh --yes`, not on a terminal | exit 0, `== passed: every request done`, about a minute, ended by itself: 18 records; the boot mrepo and the host inside it (`.git`, `inbox`, `outbox`, `packages`, `runtime.sock`); two runtimes, on the binary nvm's npm `bare` runs (recorded, no Node.js wrapper); stopped, the folder removed, none left |
| 5. `tools/haicc-try.sh` to `~/haicc-try.sh` | done (`HAICC_DEV` needed: the clone is at `~/splectrum/splectrum-dev-env-3-mycelium`) |

### 1. `boot-release.js` bundles three packages it does not assemble

Step 1 of `boot-release.js` assembles `base-package-runtime` and
`base-package-boot`, then bundles those two and `base-package-service`,
`package-docs-mrepo` and `package-docs-template`. A package's
`modules/node_modules/` is gitignored (`node_modules/`), made only by
`package-assemble.js`: in a clone where those three were never assembled
(any fresh clone, this one), bundling `base-package-service` stops on its
first third-party import. Where it was assembled before (the cloud's
checkout, by its tests), it passes, with whatever was assembled then.

**Proposed:** every package assembled right before it is bundled, one list
(the patch). Tested: a fresh worktree of `31501e6` (no
`haiccing/*/modules/node_modules` at all), the patch applied: exit 0, the
five bundles and the release.

~~~~diff
diff --git a/tools/boot-release.js b/tools/boot-release.js
index c613bdf..3369849 100644
--- a/tools/boot-release.js
+++ b/tools/boot-release.js
@@ -57,14 +57,12 @@ const meta = JSON.parse(sh('curl', ['-fsSL', '--retry', '3', `https://registry.n
 const integrity = meta.dist.integrity
 console.log(JSON.stringify({ bare: version, integrity }))
 
-// 1. The packages: modules assembled; the runtime's bundle into the sources.
-tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', 'base-package-runtime'))
-tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', 'base-package-boot'))
-tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'base-package-runtime'), `--out=${out}`)
-tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'base-package-boot'), `--out=${out}`)
-tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'base-package-service'), `--out=${out}`)
-tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'package-docs-mrepo'), `--out=${out}`)
-tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', 'package-docs-template'), `--out=${out}`)
+// 1. The packages: each assembled (its modules/, node_modules included:
+// gitignored, so not there in a fresh clone), then bundled into the sources.
+for (const p of ['base-package-runtime', 'base-package-boot', 'base-package-service', 'package-docs-mrepo', 'package-docs-template']) {
+  tool(join(dev, 'tools', 'package-assemble.js'), join(dev, 'haiccing', p))
+  tool(join(dev, 'tools', 'package-bundle.js'), join(dev, 'haiccing', p), `--out=${out}`)
+}
 
 // 2. Bare's tarball, as npm publishes it, by its organisation.
 // (kept when there: npm's tarball, the same bytes)
~~~~

## 2026-11-11, second: `ca44de2`

The prompt ran as written (the patch below applied by the cloud), with one
problem in the installed Bare (1), two smaller findings (2, 3), and the
try script not ending, from the human's run (4). The code
not changed here; a patch for (1), made and tested locally, then taken out.

| Step | Result |
|---|---|
| 2. `sh tools/install.sh` | exit 0: 237 kept (all there from the first run); `node_modules/bare-runtime-linux-x64/bin/bare` and `node_modules/.bin/bare-build` there |
| 3. `tools/bare tools/boot-release.js` | exit 0: `sources/haiccing/base-package-boot-linux-x64` (117,632,264 bytes), Bare 1.35.0 (its `.json`), `base-package-runtime.bundle`, `base-package-boot.bundle`, `manifest.json`, the addons, `holepunchto/bare-runtime-linux-x64-1.35.0.tgz` |
| 4. The check, `--yes`, not on a terminal, the human's PATH | exit 0; two records: `boot deploy /boot` (its `log`: `prerequisites`, `built`, `packages`, each `info`; `output.runtime` the command), then the runtime's status (its pid, `repository: boot`). Bare: nvm's, 1.36.0, installed, recorded in `bare.json` (see 1). Within 6 s the host in `mrepos/boot/main/host/` (`.git`, `inbox/`, `outbox/`, `packages/`, `runtime.sock`). Runtimes: three processes, not two (see 1). Stopped with `pkill -TERM`, none left; removed |
| 5. `~/haicc-try.sh --yes` (`HAICC_DEV` set: the clone is at `~/splectrum/splectrum-dev-env-3-mycelium`), no terminal | following until interrupted (SIGINT to the boot, as Ctrl-C); then exit code 0, the boot mrepo, the host inside it, the runtimes listed; on the key: the runtimes stopped, `~/haicc-try` removed, none left |
| 5, the human's run, on a terminal | the same records, then waiting: Ctrl-C needed, the pause easily missed (see 4) |

### 1. An installed Bare from npm is a Node.js script

`bare` installed with npm (here nvm's, `~/.nvm/versions/node/v24.21.0/bin/bare`,
and `/usr/local/bin/bare`) is npm's wrapper, `#!/usr/bin/env node`
(`require('bare-runtime/spawn')(...)`): it spawns the binary
(`.../lib/node_modules/bare/node_modules/bare-runtime-linux-x64/bin/bare`)
and stays its parent. The check records the wrapper, so the boot mrepo's
runtime runs under Node.js: three processes (`node .../bin/bare <bundle>`,
its Bare child, the host's runtime), Node.js needed at run time again, and
a signal to the wrapper's process is not the runtime's.

**Proposed:** the Bare found on the PATH asked which binary it runs
(`bare -e 'console.log(Bare.argv[0])'`), and that one recorded; else the
one found (`binaryOf` in `lib/prerequisites.js`). Tested with the patch:
`mrepo-base-boot` 8/8, 70 asserts (a new assert: a wrapper on the PATH,
the binary it names recorded); `base-package-boot` 3/3, 44 asserts; the
release rebuilt, step 4 again: `bare.json` records the binary, two runtime
processes (the boot mrepo's, the host's), no Node.js.

### 2. Building changes four tracked files

`tools/boot-release.js` (its `package-assemble.js`) rewrites the assembled
copies of `mrepo-base-execute/README.md` and `mrepo-base-request/README.md`
in `haiccing/base-package-boot/modules/` and
`haiccing/base-package-runtime/modules/`: the committed copies are behind
their modules. **Proposed:** the two packages assembled again and
committed. (Restored here, not committed.)

### 3. `pkill -f /tmp/boot-check/` in step 4 can end the caller's shell

An agent's shell running `pkill -TERM -f /tmp/boot-check/` has the pattern
in its own command line (and any other command there naming the folder):
pkill ends it (it happened here, twice). **Proposed** for the prompt:
`pkill -TERM -f '[/]bin/bare /tmp/boot-check/'` in a command of its own
(the bracket keeps the pattern from matching itself; the runtimes are
`<…>/bin/bare <bundle in /tmp/boot-check/> …`).

### 4. The try script does not end: a test should

The human's run of `~/haicc-try.sh`: the records came (the boot's deploy,
its runtime's status, the preloaded `boot deploy /host` to `request/done`,
the host's runtime), then nothing; it looked hung, and the human had to
Ctrl-C (`--follow` follows until Ctrl-C, whatever happens). Then the
pause, "press any key to clean up", printed without a newline after the
runtimes' list, easily missed. Without a terminal it waits for a SIGINT.

The human: "that isn't the right way for a test. After all the actions are
completed it should exit, kill the runtime."

**Proposed:** the try script a test that ends by itself: the boot run, its
records followed (shown, kept in `boot-output.jsonl`) until every request
it set off is done (here: the boot's own `boot deploy /boot` and the
preloaded `boot deploy /host` in the boot mrepo's `request/done`, the host's
runtime answering), with a time limit (failing, not hanging, when one is not
done); then what was left shown, the runtimes stopped (until none is left),
the work folder removed, and an exit code saying passed or failed. No
Ctrl-C, no key needed, the same with or without a terminal (so the agent's
step 4 can be the same script). Following open-ended (`--follow` until
Ctrl-C) stays the boot's, for watching, not the test's. No patch: how the
boot (or the script) knows "every request it set off is done" is the
design's.

### The patch for (1)

Against `ca44de2`, `git apply` (the assembled copy in
`haiccing/base-package-boot/modules/` left out: `tools/package-assemble.js
haiccing/base-package-boot` remakes it).

~~~~diff
diff --git a/pear-full-square/mrepo-base-boot/lib/prerequisites.js b/pear-full-square/mrepo-base-boot/lib/prerequisites.js
index 7d0e9d4..983421e 100644
--- a/pear-full-square/mrepo-base-boot/lib/prerequisites.js
+++ b/pear-full-square/mrepo-base-boot/lib/prerequisites.js
@@ -15,10 +15,10 @@
 //   bare       the Bare recorded in <work>/bare.json, else the pinned one at
 //              <work>/bare/bin/bare, else one installed (ctx.path, a PATH:
 //              the first `bare` there at the pinned major, the same version
-//              or newer), recorded; fix: the pinned one put in place from the
-//              sources (folder: <path>/holepunchto/<tarball>, by its
-//              organisation; github: npm's registry), checked against its
-//              sha512
+//              or newer; npm's wrapper asked for the binary it runs),
+//              recorded; fix: the pinned one put in place from the sources
+//              (folder: <path>/holepunchto/<tarball>, by its organisation;
+//              github: npm's registry), checked against its sha512
 //   docker     Docker Engine installed, running, rootful, native, the user in
 //              its group
 // Conditions (`when`): 'not-in-container' (no /.dockerenv, no container
@@ -119,13 +119,20 @@ const versionOf = b => {
   const r = run(b, ['--version'])
   return r.status === 0 ? r.stdout.toString().trim().replace(/^v/, '') : null
 }
+// The binary itself: npm's `bare` is a Node.js script that spawns it and
+// stays its parent, so asked, the Bare it runs is recorded (else as found).
+const binaryOf = b => {
+  const r = run(b, ['-e', 'console.log(Bare.argv[0])'])
+  const real = r.status === 0 ? r.stdout.toString().trim() : ''
+  return real.startsWith('/') && existsSync(real) ? real : b
+}
 // The first `bare` on the PATH at an acceptable version.
 function installed (path, want) {
   for (const dir of String(path ?? '').split(':').filter(Boolean)) {
     const b = join(dir, 'bare')
     if (!existsSync(b)) continue
     const version = versionOf(b)
-    if (version && acceptable(version, want)) return { bare: b, version }
+    if (version && acceptable(version, want)) return { bare: binaryOf(b), version }
   }
   return null
 }
diff --git a/pear-full-square/mrepo-base-boot/test/prerequisites.test.js b/pear-full-square/mrepo-base-boot/test/prerequisites.test.js
index 7d69a9c..4d89e92 100644
--- a/pear-full-square/mrepo-base-boot/test/prerequisites.test.js
+++ b/pear-full-square/mrepo-base-boot/test/prerequisites.test.js
@@ -83,6 +83,15 @@ test('bare: an installed one on the PATH, at the pinned major, the same or newer
     t.alike(found.results[0].value, { bare: join(good, 'bare'), version: '1.40.1', installed: true })
     t.is(bareOf(work), join(good, 'bare'), 'recorded: the one the mrepo runs on')
     t.absent(existsSync(join(work, 'bare')), 'no Bare of its own')
+    // npm's wrapper: asked, it names the binary it runs; that one recorded
+    const real = fake('1.40.2')
+    const wrapper = join(bins, 'wrapper'); mkdirSync(wrapper)
+    writeFileSync(join(wrapper, 'bare'), `#!/bin/sh\n[ "$1" = -e ] && echo ${join(real, 'bare')} || echo v1.40.2\n`); chmodSync(join(wrapper, 'bare'), 0o755)
+    const w = mkdtempSync(join(tmpdir(), 'pre-wrap-'))
+    try {
+      const viaWrapper = await check(list, { ...ctx, work: w, path: wrapper })
+      t.is(viaWrapper.results[0].value.bare, join(real, 'bare'), 'a wrapper on the PATH: the binary it runs recorded')
+    } finally { rmSync(w, { recursive: true, force: true }) }
     const again = await check(list, { ...ctx })
     t.ok(again.ok && again.results[0].value.installed, 'next time: the recorded one, no PATH needed')
     rmSync(good, { recursive: true, force: true })
~~~~

## 2026-11-11, first: `6599afd`

2026-11-11, on the local machine (Linux x86-64, WSL2), following
`prompt-local.md` at `6599afd`, offline (the connection poor): every
download kept in a local source, `~/haicc-release/sources/` (npm's
tarballs by URL, a `curl` that serves them, git URLs to local mirrors), so
`tools/install.sh` and `tools/boot-release.js` run with no network.

The prompt did not run as written. What failed, why, and the change that
made it run is proposed here; **the code is not changed in this commit**
(the human: "you propose in a note back to cloud, and only commit the
note"). The changes were made and tested locally, then taken out; the patch
is at the end (`git apply`; the assembled copy in
`haiccing/base-package-boot/modules/` left out: `tools/package-assemble.js
haiccing/base-package-boot` remakes it). Made against `6599afd`; on parts
20 and 21 (`6a072ff`) `git apply -3` applies it with two small conflicts:
`haiccing/base-package-boot/README.md` (the prerequisites paragraph) and
`pear-full-square/mrepo-base-boot/index.js` (the export line, `acceptable`
added). The release built and tested here is from `6599afd` with the patch,
before parts 20 and 21. (Applied by the cloud in `ff7301b`.)

### 1. `tools/install.sh`: the lockfile no longer fits one argument

`"$bare" -e "const l = $(cat package-lock.json) ..."` passes the lockfile as
one argument; with `bare-build` it is 135,325 bytes, over Linux's limit for
a single argument (`MAX_ARG_STRLEN`, 131,072):
`bare: Argument list too long`, nothing installed. For everyone, not only
offline.

**Proposed:** the script written to a file in the temporary folder and run
(`$bare $tmp/list.js`); `mktemp` moved before it.

### 2. `tools/install.sh`: `bare-build` for every platform (314 MB)

`bare-build` lists its 13 platform prebuilts (`bare-build-<platform>`) as
plain dependencies, so their lockfile entries carry no `os`/`cpu` and
`install.sh` fetches them all; with `bare-apk` and `bare-app-image` (the
Android and AppImage builders, optional, no `os` on `bare-apk`): 22 packages,
314 MB to download, 965 MB unpacked (the prompt's "about 1 GB" is the
unpacked size). `bare-build` loads a platform's prebuilt only when building
for it (`lib/prebuilds.js`); `--standalone` never loads the Android or
AppImage builders.

**Proposed:** of `bare-build-*`, only this platform's
(`bare-build-${Bare.platform}-${Bare.arch}`); `bare-apk` and
`bare-app-image` skipped: about 46 MB (`bare-build`, its linux-x64
prebuilt, `bare-lief`, five small ones). Named in `install.sh`, not a
general rule: `quickbit-native` and `simdle-native` are optional too, and
needed.

### 3. `tools/install.sh`: no `node_modules/.bin`

The prompt (step 2) and `boot-release.js` expect
`node_modules/.bin/bare-build`; `install.sh` links no commands.

**Proposed:** a top-level package's `bin` (from its lockfile entry) linked
into `node_modules/.bin`, as npm does (a `bin` line in the list).

### 4. `tools/boot-release.js`: `bare-build` needs Node.js, and `bare-apk` on it

`bare-build`'s `bin.js` is `#!/usr/bin/env node`. On Node.js its `#apk`
import is plain `bare-apk` (no fallback): with (2), `Cannot find module
'#apk'`. On Bare, `#apk` and `#app-image` fall back to `unsupported.js`.

**Proposed:** `bare-build` run with Bare: `tools/bare
node_modules/bare-build/bin.js ...` (a `build()` helper); the missing-check
message says `sh tools/install.sh`. The release is then built with no
Node.js (the prompt says none is needed; it was, for `bare-build`).

### 5. The boot: an installed Bare first (the human's decision)

The boot only looked at `<work>/bare/bin/bare` and offered to put the
pinned Bare there, on every fresh work folder, with Bare installed on the
machine (here 1.36.0 by nvm, first on the PATH; 1.24.2 in
`/usr/local/bin`). The human: "it should try to check installed version";
asked, they chose: **accepted at the pinned major, the same version or
newer** (1.24.2 refused; 1.36.0 taken for a pinned 1.35.0), and **its path
recorded in the work folder** (not a link). This replaces "one version" in
`docs/design/packages.md` (the executable on its built-in 1.35.0, the
mrepos it starts on the installed one; here the runtime's bundle is built
on 1.36.0 anyway).

**Proposed** (`mrepo-base-boot`'s `lib/prerequisites.js`), the `bare` check
in order:

1. the Bare recorded in `<work>/bare.json` (`{ bare, version, installed }`),
   if an installed one, still there, at an acceptable version;
2. the pinned one put in place before (`<work>/bare/`, its
   `tarball.sha512`), as now;
3. the first `bare` on the PATH (`ctx.path`; `run.js` passes
   `process.env.PATH`; no search without it) at an acceptable version
   (`acceptable(have, want)`, exported): recorded, used;
4. none: missing, the fix offered as now (putting the pinned one in place
   also records it).

`bareOf(work)` is the one recorded (else `<work>/bare/bin/bare`), so `next`
starts the runtime on it. Only an installed Bare's version can be asked (no
sha512). Recording it writes `<work>/bare.json` during the check (the work
check has made the folder already): to settle whether that is right for
"checked before anything is written". The design note, the module's and
the package's READMEs and `run.js`'s header updated in the patch.

Tests: `mrepo-base-boot` a new test (a fake `bare` answering its version:
newer 1.x taken, older and another major refused, recorded, used next time
without a PATH, missing again when gone): 7/7, 63 asserts.
`base-package-boot`'s boot tests run the boot with a PATH without any
`bare` (else the machine's own is found), and a new test boots with the
running Bare on the PATH, no `--yes`: used, recorded, nothing put in place,
`next` on it, run again without it on the PATH: 3/3, 35 asserts (Bare
1.36.0's tarball copied into `sources/holepunchto/` for them: the package's
own pin).

### What ran, with the patch applied

| Step | Result |
|---|---|
| `sh tools/install.sh`, a fresh worktree, no network, no Node.js on the PATH | 236 fetched, 34 linked; `node_modules/.bin/bare-build` there |
| `tools/bare tools/boot-release.js`, the same | passed: the release (117,595,400 bytes), Bare 1.35.0 (the one `bare-build` 1.6.2 builds in), its tarball in `sources/holepunchto/` |
| Step 4, the same, `--yes` | exit 0: `prerequisites`, `built`, `packages`; Bare put in place from the sources |
| Step 4 with (5), the human's PATH, no `--yes` | exit 0, no question: nvm's 1.36.0 found and recorded, no `<work>/bare/` |
| `~/haicc-try.sh --yes` (the prompt's step 5, `HAICC_DEV` set: the clone is at `~/splectrum/splectrum-dev-env-3-mycelium`) | exit 0, cleaned up |

Not checked: the runtime started by `next` (on the installed 1.36.0).

### The patch

~~~~diff
diff --git a/docs/design/packages.md b/docs/design/packages.md
index efee1ef..8fba026 100644
--- a/docs/design/packages.md
+++ b/docs/design/packages.md
@@ -166,8 +166,8 @@ executable, platform-specific** (`bare-build --standalone`: Bare built in,
 the bundle embedded, native libraries self-extracting; one a platform,
 `linux-x64` first). No prerequisite outside it. It checks the machine at
 the start of `run.js` (before anything is written), unpacks the boot mrepo,
-puts Bare in place **only if none is there** (pinned, checked: every later
-mrepo process runs on it), and starts the boot's runtime from the
+puts Bare in place **only if none is there** (pinned, checked; or an
+installed one used, below: every later mrepo process runs on it), and starts the boot's runtime from the
 repository's own `packages/` (`base-package-mrepo`), then exits. The other
 packages stay plain bundles. Tried (2026-11-11): a standalone of
 `base-package-boot/run.js` builds (104 MB) and loads all its modules,
@@ -176,9 +176,14 @@ native addons included; files beside the code are not there inside it
 module; its Bare (v1.35.0, `bare-build` 1.6.2) is not the repository's
 (v1.36.0). **The Bare version is the one provided** (the human,
 2026-11-11): what `bare-build` builds in when the boot is built is the Bare
-that release puts in place (pinned, checked), so the executable and every
-mrepo it starts run on one version; a newer `bare-build` moves it. No
-custom runtime.
+that release puts in place (pinned, checked); a newer `bare-build` moves
+it. No custom runtime. **An installed Bare first** (the human, 2026-11-11,
+replacing "one version"): the boot's check takes a Bare installed on the
+machine (the first `bare` on the PATH) at the pinned major, the same
+version or newer, and records it in `<work>/bare.json` (its path, its
+version; the mrepos started there run on it; only its version can be
+asked, no sha512); none there, the pinned one is put in place as before,
+with a yes. **Built** (2026-11-11).
 
 **Prerequisites** (agreed, the human, 2026-11-11): each mrepo checks its
 own when it is deployed, declared with their conditions in its package's
@@ -188,7 +193,7 @@ missing; the outcome recorded in the request.
 | Prerequisite | When | Whose |
 |---|---|---|
 | platform (`linux-x64`), the work folder (writable, no other mrepo there), the sources reachable | always | the boot, at the start of `run.js` |
-| Bare | always; put in place if missing | the boot |
+| Bare | always; an installed one (the pinned major, the same or newer) used, else the pinned one put in place | the boot |
 | Docker Engine (installed, running, rootful, native; the user in its group) | only where nodes run as containers, and not inside a container itself (`/.dockerenv`, `/proc/1/cgroup`) | the host |
 
 No longer needed: git (p2p-git), curl (fetching in Bare). In a container
diff --git a/haiccing/base-package-boot/README.md b/haiccing/base-package-boot/README.md
index 277d38c..f0d0070 100644
--- a/haiccing/base-package-boot/README.md
+++ b/haiccing/base-package-boot/README.md
@@ -19,8 +19,10 @@ command as typed, a GUID), each step's outcome logged in it:
 
 1. **Prerequisites** (`prerequisites.json`), before anything is written:
    the platform (`linux-x64`), the work folder (writable, not the
-   filesystem's root, no other mrepo there), the sources, Bare (`bare.json`:
-   put in place at `<work>/bare/` if missing, only with a yes). One missing:
+   filesystem's root, no other mrepo there), the sources, Bare (one
+   installed on the PATH at `bare.json`'s major, the same version or newer;
+   else the pinned one, `bare.json`, put in place at `<work>/bare/`, only
+   with a yes; the one used recorded in `<work>/bare.json`). One missing:
    it says which and stops (exit 3), the request printed only.
 2. **The boot mrepo built** the first time into `<work>/mrepos/boot/` (from
    `mrepo/`; in the release, embedded).
@@ -30,7 +32,7 @@ command as typed, a GUID), each step's outcome logged in it:
    the list and hashes committed.
 4. **Its request**, completed, into its `request/execute`, and printed, with
    `next`: the command that starts its runtime. The runtime is not started
-   by the boot (for now): `<work>/bare/bin/bare
+   by the boot (for now): `<the Bare recorded>
    <work>/mrepos/boot/packages/haiccing/base-package-runtime.bundle
    --work=<work>`. Started, it moves the request to `request/done` first,
    then runs the preloaded `service start /`.
diff --git a/haiccing/base-package-boot/run.js b/haiccing/base-package-boot/run.js
index b3a4c35..1fb269e 100644
--- a/haiccing/base-package-boot/run.js
+++ b/haiccing/base-package-boot/run.js
@@ -3,8 +3,10 @@
 // is a request from the start, a record (boot deploy /boot, the command as
 // typed, its key a GUID); each step's outcome logged in it:
 //   1. the prerequisites (prerequisites.json), before anything is written:
-//      the platform, the work folder, the sources, Bare (bare.json: put in
-//      place if missing, only with a yes); a missing one stops it (exit 3),
+//      the platform, the work folder, the sources, Bare (one installed on
+//      the PATH at bare.json's major, the same version or newer; else the
+//      pinned one, bare.json, put in place, only with a yes; the one used
+//      recorded in <work>/bare.json); a missing one stops it (exit 3),
 //      the request printed only (no mrepo to hold it);
 //   2. the boot mrepo built from its structure into <work>/mrepos/boot/ the
 //      first time (mrepo/: in the release, the module mrepo-files.js);
@@ -64,7 +66,7 @@ const core = record(null, { api: NAME, protocol: 'boot', action: 'deploy', uri:
 const outcomes = []
 const done = result => complete(core, result)
 
-const pre = await check(prerequisites.prerequisites, { work, name: NAME, sources, bare, yes: args.includes('--yes'), ask })
+const pre = await check(prerequisites.prerequisites, { work, name: NAME, sources, bare, path: process.env.PATH, yes: args.includes('--yes'), ask })
 outcomes.push({ step: 'prerequisites', ok: pre.ok, results: pre.results })
 if (!pre.ok) {
   // No mrepo to hold it: printed only.
diff --git a/haiccing/base-package-boot/test/boot/boot.test.js b/haiccing/base-package-boot/test/boot/boot.test.js
index 6b9ac84..f5d1a59 100644
--- a/haiccing/base-package-boot/test/boot/boot.test.js
+++ b/haiccing/base-package-boot/test/boot/boot.test.js
@@ -25,9 +25,12 @@ const SOURCES = resolve(process.env.SOURCES || join(pkg, '..', '..', 'sources'))
 const have = existsSync(join(SOURCES, 'holepunchto', `bare-runtime-${os.platform()}-${os.arch()}-${bare.version}.tgz`)) &&
   existsSync(join(SOURCES, 'haiccing', 'base-package-runtime.bundle'))
 
-// A run of the boot: its exit code and what it printed (one record a line).
-function boot (work, extra) {
-  const r = spawnSync(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] })
+// The PATH without any `bare` on it: the machine's own Bare not found.
+const NO_BARE = String(process.env.PATH ?? '').split(':').filter(d => d && !existsSync(join(d, 'bare'))).join(':')
+// A run of the boot: its exit code and what it printed (one record a line);
+// its PATH NO_BARE unless given.
+function boot (work, extra, path = NO_BARE) {
+  const r = spawnSync(os.execPath(), [join(pkg, 'run.js'), `--work=${work}`, ...extra], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: path } })
   return { code: r.status, lines: r.stdout.toString().split('\n').filter(Boolean).map(l => JSON.parse(l)), err: r.stderr.toString() }
 }
 // A request posted to the boot's inbox (its folder), its completed form read
@@ -109,3 +112,25 @@ test('the boot: put in place up to the runtime; the runtime started from its pac
     t.ok((await repo.select(`/request/done/${PRELOADED}.json`)).length, 'the preloaded request done, once')
   } finally { rmSync(work, { recursive: true, force: true }) }
 })
+
+test('an installed Bare on the PATH: used, recorded, none put in place, no question', { timeout: 120000, skip: !have }, async (t) => {
+  const work = mkdtempSync(join(tmpdir(), 'boot-inst-'))
+  const bin = mkdtempSync(join(tmpdir(), 'boot-bin-'))
+  try {
+    // the Bare running this test, installed as `bare` (the pinned version, or newer)
+    fs.symlinkSync(os.execPath(), join(bin, 'bare'))
+    const r = boot(work, [`--sources=folder:${SOURCES}`], [bin, NO_BARE].join(':'))
+    t.is(r.code, 0, `done without --yes ${r.err}`)
+    const out = r.lines.at(-1).value.output
+    const b = out.outcomes[0].results.find(c => c.check === 'bare')
+    t.ok(b.value.installed && !b.fixed, 'the installed one: used')
+    t.is(b.value.bare, join(bin, 'bare'))
+    t.absent(existsSync(join(work, 'bare')), 'no Bare put in place')
+    t.is(JSON.parse(readFileSync(join(work, 'bare.json'))).bare, join(bin, 'bare'), 'recorded in the work folder')
+    t.ok(out.next.startsWith(`${join(bin, 'bare')} `), 'next: the runtime on it')
+    t.is(boot(work, [`--sources=folder:${SOURCES}`]).code, 0, 'run again: the recorded one, without it on the PATH')
+  } finally {
+    rmSync(work, { recursive: true, force: true })
+    rmSync(bin, { recursive: true, force: true })
+  }
+})
diff --git a/pear-full-square/mrepo-base-boot/README.md b/pear-full-square/mrepo-base-boot/README.md
index 26a7e7b..56f1a61 100644
--- a/pear-full-square/mrepo-base-boot/README.md
+++ b/pear-full-square/mrepo-base-boot/README.md
@@ -28,8 +28,11 @@ The mrepo boot protocol, the base variant: `deploy`, `teardown`,
   build. The install routine's first piece.
 - `lib/prerequisites.js`: an mrepo's prerequisites, checked before
   anything is written (`check(list, ctx)`): `platform`, `work`, `sources`,
-  `bare` (fixed, with a yes: the pinned Bare put in place from the sources,
-  a folder's `holepunchto/` or npm's registry, checked by its sha512),
+  `bare` (the one recorded in `<work>/bare.json`, else one installed on the
+  PATH at the pinned major, the same version or newer, recorded; fixed,
+  with a yes: the pinned Bare put in place from the sources, a folder's
+  `holepunchto/` or npm's registry, checked by its sha512; `bareOf(work)`
+  the one recorded),
   `docker` (installed, running, rootful, native, the user in its group); a
   condition each (`when: 'not-in-container'`). Stops at the first missing.
 - `index.js` exports them. `haiccing/base-package-boot`'s `protocol.js`
diff --git a/pear-full-square/mrepo-base-boot/index.js b/pear-full-square/mrepo-base-boot/index.js
index 5f38844..2418d59 100644
--- a/pear-full-square/mrepo-base-boot/index.js
+++ b/pear-full-square/mrepo-base-boot/index.js
@@ -10,4 +10,4 @@
 export { build } from './lib/build.js'
 export { deploy, teardown, redeploy } from './lib/deploy.js'
 export { place, storeOf } from './lib/packages.js'
-export { check, parseSource, inContainer, bareOf, BARE_ORG, TARBALL } from './lib/prerequisites.js'
+export { check, parseSource, inContainer, bareOf, acceptable, BARE_ORG, TARBALL } from './lib/prerequisites.js'
diff --git a/pear-full-square/mrepo-base-boot/lib/prerequisites.js b/pear-full-square/mrepo-base-boot/lib/prerequisites.js
index 18a82e4..7d0e9d4 100644
--- a/pear-full-square/mrepo-base-boot/lib/prerequisites.js
+++ b/pear-full-square/mrepo-base-boot/lib/prerequisites.js
@@ -2,7 +2,8 @@
 // declared with their conditions in its package's config, checked when it
 // is deployed, before anything is written; a fix only with a yes.
 //   check(list, ctx)  list: [{ check, when?, fix?, ... }]; ctx: { work,
-//                     sources, bare: { version, integrity }, yes, ask }.
+//                     sources, bare: { version, integrity }, path?, yes,
+//                     ask }.
 //                     Each in order: { check, ok, value | missing, fixed?,
 //                     skipped? }; stops at the first that fails and is not
 //                     fixed. Resolves { ok, results }.
@@ -11,10 +12,13 @@
 //   work       the work folder writable, not the filesystem's root, no other mrepo there ({ name }: the
 //              one this deploys may be there already)
 //   sources    each reachable: a folder there; github: its host answering
-//   bare       Bare at <work>/bare/bin/bare, from the pinned tarball; fix: put
-//              in place from the sources (folder: <path>/holepunchto/<tarball>,
-//              by its organisation; github: npm's registry), checked against
-//              its sha512
+//   bare       the Bare recorded in <work>/bare.json, else the pinned one at
+//              <work>/bare/bin/bare, else one installed (ctx.path, a PATH:
+//              the first `bare` there at the pinned major, the same version
+//              or newer), recorded; fix: the pinned one put in place from the
+//              sources (folder: <path>/holepunchto/<tarball>, by its
+//              organisation; github: npm's registry), checked against its
+//              sha512
 //   docker     Docker Engine installed, running, rootful, native, the user in
 //              its group
 // Conditions (`when`): 'not-in-container' (no /.dockerenv, no container
@@ -95,7 +99,36 @@ async function fetchBare (sources, version) {
   return null
 }
 
-export const bareOf = work => join(work, 'bare', 'bin', 'bare')
+// The Bare an mrepo runs on, recorded in <work>/bare.json ({ bare, version,
+// installed }): one installed on the machine, or the pinned one put in place
+// at <work>/bare/bin/bare (also without a record, as before there was one).
+const placed = work => join(work, 'bare', 'bin', 'bare')
+const recordOf = work => { try { return JSON.parse(readFileSync(join(work, 'bare.json'), 'utf8')) } catch { return null } }
+const remember = (work, r) => { mkdirSync(work, { recursive: true }); writeFileSync(join(work, 'bare.json'), JSON.stringify(r, null, 2) + '\n'); return r }
+export const bareOf = work => recordOf(work)?.bare ?? placed(work)
+
+// An installed Bare is accepted at the pinned version's major, the same or
+// newer (the human, 2026-11-11): only its version can be asked, no sha512.
+export function acceptable (have, want) {
+  const [a, b] = [have, want].map(v => String(v).replace(/^v/, '').split('.').map(Number))
+  if (a.length < 3 || a.some(Number.isNaN) || a[0] !== b[0]) return false
+  for (let i = 1; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
+  return true
+}
+const versionOf = b => {
+  const r = run(b, ['--version'])
+  return r.status === 0 ? r.stdout.toString().trim().replace(/^v/, '') : null
+}
+// The first `bare` on the PATH at an acceptable version.
+function installed (path, want) {
+  for (const dir of String(path ?? '').split(':').filter(Boolean)) {
+    const b = join(dir, 'bare')
+    if (!existsSync(b)) continue
+    const version = versionOf(b)
+    if (version && acceptable(version, want)) return { bare: b, version }
+  }
+  return null
+}
 
 async function putBare ({ work, sources, bare }) {
   const got = await fetchBare(sources, bare.version)
@@ -115,7 +148,8 @@ async function putBare ({ work, sources, bare }) {
   writeFileSync(join(tmp, 'tarball.sha512'), bare.integrity + '\n')
   rmSync(dir, { recursive: true, force: true })
   renameSync(tmp, dir)
-  return { ok: true, value: { bare: bareOf(work), version: bare.version, from: got.from } }
+  remember(work, { bare: placed(work), version: bare.version, installed: false })
+  return { ok: true, value: { bare: placed(work), version: bare.version, from: got.from } }
 }
 
 const CHECKS = {
@@ -142,11 +176,24 @@ const CHECKS = {
     }
     return { ok: true, value: sources.map(s => s.kind === 'folder' ? `folder:${s.path}` : `github:${s.org}`) }
   },
-  bare (_, { work, bare }) {
-    const b = bareOf(work)
+  bare (_, { work, bare, path }) {
+    // 1. the one recorded, if it is an installed one still there at an acceptable version
+    const rec = recordOf(work)
+    if (rec?.installed && existsSync(rec.bare)) {
+      const version = versionOf(rec.bare)
+      if (version && acceptable(version, bare.version)) return { ok: true, value: { bare: rec.bare, version, installed: true } }
+    }
+    // 2. the pinned one, put in place here before
+    const b = placed(work)
     const pinned = join(work, 'bare', 'tarball.sha512')
-    if (existsSync(b) && existsSync(pinned) && readFileSync(pinned, 'utf8').trim() === bare.integrity) return { ok: true, value: { bare: b, version: bare.version } }
-    return { ok: false, missing: `Bare ${bare.version} at ${b}`, fix: 'put Bare in place' }
+    if (existsSync(b) && existsSync(pinned) && readFileSync(pinned, 'utf8').trim() === bare.integrity) {
+      if (rec?.bare !== b) remember(work, { bare: b, version: bare.version, installed: false })
+      return { ok: true, value: { bare: b, version: bare.version } }
+    }
+    // 3. one installed on the machine (searched only when given a PATH)
+    const found = installed(path, bare.version)
+    if (found) return { ok: true, value: remember(work, { ...found, installed: true }) }
+    return { ok: false, missing: `Bare ${bare.version} (or a newer ${bare.version.split('.')[0]}.x installed) at ${b}`, fix: 'put Bare in place' }
   },
   docker () {
     const info = run('docker', ['info', '--format', '{{json .}}'])
diff --git a/pear-full-square/mrepo-base-boot/test/prerequisites.test.js b/pear-full-square/mrepo-base-boot/test/prerequisites.test.js
index a617be4..7d69a9c 100644
--- a/pear-full-square/mrepo-base-boot/test/prerequisites.test.js
+++ b/pear-full-square/mrepo-base-boot/test/prerequisites.test.js
@@ -1,9 +1,9 @@
 import test from 'brittle'
-import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'bare-fs'
+import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync, chmodSync } from 'bare-fs'
 import { join } from 'bare-path'
 import os, { tmpdir } from 'bare-os'
 import { spawnSync } from 'bare-subprocess'
-import { check, parseSource, inContainer, bareOf, BARE_ORG } from '../lib/prerequisites.js'
+import { check, parseSource, inContainer, bareOf, acceptable, BARE_ORG } from '../lib/prerequisites.js'
 
 // Bare's tarball for putting it in place: from this repository's node_modules
 // (the lockfile's pin), packed as npm publishes it, into a folder source.
@@ -64,6 +64,36 @@ test('bare: missing, not fixed without a yes; put in place from a folder source,
   }
 })
 
+test('bare: an installed one on the PATH, at the pinned major, the same or newer; recorded, used next time', async (t) => {
+  const work = mkdtempSync(join(tmpdir(), 'pre-inst-'))
+  const bins = mkdtempSync(join(tmpdir(), 'pre-bins-'))
+  // a `bare` that only answers its version, one a folder
+  const fake = v => { const d = join(bins, v); mkdirSync(d); writeFileSync(join(d, 'bare'), `#!/bin/sh\necho v${v}\n`); chmodSync(join(d, 'bare'), 0o755); return d }
+  try {
+    t.ok(acceptable('1.36.0', '1.35.0') && acceptable('v1.35.0', '1.35.0') && acceptable('1.35.2', '1.35.0'), 'the same or newer: accepted')
+    t.absent(acceptable('1.24.2', '1.35.0') || acceptable('1.34.9', '1.35.0') || acceptable('2.0.0', '1.35.0') || acceptable('x', '1.35.0'), 'older, another major, no version: refused')
+    const [old, other, good] = [fake('1.24.2'), fake('2.1.0'), fake('1.40.1')]
+    const list = [{ check: 'bare', fix: true }]
+    const ctx = { work, sources: [], bare: BARE, ask: async () => false }
+    const none = await check(list, { ...ctx, path: [old, other].join(':') })
+    t.absent(none.ok, 'only an older one and another major: missing')
+    t.absent(existsSync(join(work, 'bare.json')), 'nothing recorded')
+    const found = await check(list, { ...ctx, path: [old, good, other].join(':') })
+    t.ok(found.ok && !found.results[0].fixed, 'a newer 1.x on the PATH: used, nothing put in place')
+    t.alike(found.results[0].value, { bare: join(good, 'bare'), version: '1.40.1', installed: true })
+    t.is(bareOf(work), join(good, 'bare'), 'recorded: the one the mrepo runs on')
+    t.absent(existsSync(join(work, 'bare')), 'no Bare of its own')
+    const again = await check(list, { ...ctx })
+    t.ok(again.ok && again.results[0].value.installed, 'next time: the recorded one, no PATH needed')
+    rmSync(good, { recursive: true, force: true })
+    const gone = await check(list, { ...ctx })
+    t.absent(gone.ok, 'the recorded one gone: missing again (and the fix offered)')
+  } finally {
+    rmSync(work, { recursive: true, force: true })
+    rmSync(bins, { recursive: true, force: true })
+  }
+})
+
 test('docker: only where its condition holds', async (t) => {
   const r = await check([{ check: 'docker', when: 'not-in-container' }], {})
   if (inContainer()) t.is(r.results[0].skipped, 'not-in-container', 'in a container: skipped')
diff --git a/steps/2-rebuild/prompt-local.md b/steps/2-rebuild/prompt-local.md
index 56b08fc..d94260c 100644
--- a/steps/2-rebuild/prompt-local.md
+++ b/steps/2-rebuild/prompt-local.md
@@ -11,7 +11,7 @@ tar). Nothing is published: no GitHub release, no push of the build.
 >    yet: clone it first), check out `main` and pull.
 > 2. **Install the dependencies.** `sh tools/install.sh` (no Node.js or npm
 >    needed: it replays `package-lock.json` with curl and tar; this time it
->    adds `bare-build`, about 1 GB). Then check that both exist:
+>    adds `bare-build`, this platform's only, about 46 MB). Then check that both exist:
 >    `node_modules/bare-runtime-linux-x64/bin/bare` and
 >    `node_modules/.bin/bare-build`.
 > 3. **Build the release into the local sources.** From the clone's folder:
diff --git a/tools/boot-release.js b/tools/boot-release.js
index f050479..c50ee63 100644
--- a/tools/boot-release.js
+++ b/tools/boot-release.js
@@ -29,14 +29,17 @@ const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
 const flag = (n, d) => process.argv.slice(2).find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
 const out = resolve(flag('out', join(dev, 'sources')))
 const platform = `${os.platform()}-${os.arch()}`
-const bareBuild = join(dev, 'node_modules', '.bin', 'bare-build')
+// bare-build run with Bare, not its node shebang: no Node.js needed, and on
+// Bare its Android and AppImage builders fall back to unsupported (not installed)
+const bareBuild = join(dev, 'node_modules', 'bare-build', 'bin.js')
 const tool = (...a) => { const r = spawnSync(join(dev, 'tools', 'bare'), a, { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`failed: ${a.join(' ')}`) }
 const sh = (cmd, a, opts = {}) => { const r = spawnSync(cmd, a, { stdio: ['ignore', 'pipe', 'inherit'], ...opts }); if (r.status !== 0) throw new Error(`failed: ${cmd} ${a.join(' ')}`); return r.stdout.toString().trim() }
+const build = a => sh(join(dev, 'tools', 'bare'), [bareBuild, ...a])
 const files = (dir, at = '') => readdirSync(join(dir, at)).sort().flatMap(n => {
   const p = at ? `${at}/${n}` : n
   return lstatSync(join(dir, p)).isDirectory() ? files(dir, p) : [p]
 })
-if (!existsSync(bareBuild)) { console.error('bare-build is missing: npm install --ignore-scripts'); process.exit(2) }
+if (!existsSync(bareBuild)) { console.error('bare-build is missing: sh tools/install.sh'); process.exit(2) }
 
 mkdirSync(out, { recursive: true })
 const tmp = join(out, '.stage')
@@ -46,7 +49,7 @@ rmSync(tmp, { recursive: true, force: true })
 mkdirSync(join(tmp, 'probe'), { recursive: true })
 writeFileSync(join(tmp, 'probe', 'package.json'), '{ "name": "probe", "type": "module" }\n')
 writeFileSync(join(tmp, 'probe', 'probe.js'), 'console.log(Bare.version)\n')
-sh(bareBuild, ['--standalone', '--base', join(tmp, 'probe'), '--out', join(tmp, 'probe-out'), join(tmp, 'probe', 'probe.js')])
+build(['--standalone', '--base', join(tmp, 'probe'), '--out', join(tmp, 'probe-out'), join(tmp, 'probe', 'probe.js')])
 const version = sh(join(tmp, 'probe-out', 'probe'), []).replace(/^v/, '')
 // Its tarball as npm's registry publishes it (curl: no npm needed).
 const meta = JSON.parse(sh('curl', ['-fsSL', '--retry', '3', `https://registry.npmjs.org/bare-runtime-${platform}/${version}`]))
@@ -72,7 +75,7 @@ writeFileSync(join(stage, 'mrepo-files.js'), `// The boot mrepo's structure, emb
 writeFileSync(join(stage, 'bare.json'), JSON.stringify({ description: 'The Bare the boot puts in place, pinned: the one built into it.', version, integrity }, null, 2) + '\n')
 
 // 4. The standalone executable.
-sh(bareBuild, ['--standalone', '--base', stage, '--out', join(tmp, 'boot-out'), join(stage, 'run.js')])
+build(['--standalone', '--base', stage, '--out', join(tmp, 'boot-out'), join(stage, 'run.js')])
 const exe = readdirSync(join(tmp, 'boot-out'))[0]
 const release = join(out, 'haiccing', `base-package-boot-${platform}`)
 mkdirSync(dirname(release), { recursive: true })
diff --git a/tools/install.sh b/tools/install.sh
index d42a9aa..401bcbc 100755
--- a/tools/install.sh
+++ b/tools/install.sh
@@ -6,7 +6,10 @@
 # turns the lockfile into a list, and the shell installs it: each package
 # from the registry fetched with curl, checked against its sha512, unpacked
 # with tar into its lockfile path; the git dependency fetched at its commit;
-# workspaces linked; other platforms' optional packages skipped; a package
+# workspaces linked; other platforms' optional packages skipped, and of
+# bare-build only this platform's prebuilt, no Android or AppImage builder
+# (the releases are --standalone: about 46 MB instead of 314); the top-level
+# packages' commands linked into node_modules/.bin; a package
 # already there at its version kept. npm is needed only to change the
 # dependencies (resolve versions, write a new package-lock.json).
 #   sh tools/install.sh
@@ -20,18 +23,28 @@ sri=$(printf '%s\n' "$entry" | sed -n 's/.*"integrity": "\(.*\)".*/\1/p' | head
 ensure_bare "$url" "$sri" "$dev/node_modules/bare-runtime-linux-x64"
 bare=$dev/node_modules/bare-runtime-linux-x64/bin/bare
 
+tmp=$(mktemp -d)
+trap 'rm -rf "$tmp"' EXIT
+
 # The lockfile as a list, one package a line: kind path url-or-target sri version.
-list=$("$bare" -e "
-const l = $(cat "$dev/package-lock.json")
+# A script file, not -e: the lockfile is larger than one argument may be.
+{ printf 'const l = '; cat "$dev/package-lock.json"; cat <<'EOF'
 for (const [path, e] of Object.entries(l.packages)) {
   if (!path.startsWith('node_modules/')) continue
   if (e.link) { console.log(['link', path, e.resolved].join(' ')); continue }
   if ((e.os && !e.os.includes(Bare.platform)) || (e.cpu && !e.cpu.includes(Bare.arch))) continue
+  // bare-build: only this platform's prebuilt (its other platforms' are plain
+  // dependencies, unmarked); no Android or AppImage builder (--standalone only)
+  const name = path.slice(path.lastIndexOf('node_modules/') + 13)
+  if (/^bare-build-/.test(name) && name !== 'bare-build-' + Bare.platform + '-' + Bare.arch) continue
+  if (name === 'bare-apk' || name === 'bare-app-image') continue
   console.log([String(e.resolved).startsWith('git+') ? 'git' : 'tar', path, e.resolved, e.integrity || '-', e.version].join(' '))
-}")
-
-tmp=$(mktemp -d)
-trap 'rm -rf "$tmp"' EXIT
+  // a top-level package's commands, linked into node_modules/.bin as npm does
+  if (path === 'node_modules/' + name) for (const [cmd, file] of Object.entries(e.bin || {})) console.log(['bin', 'node_modules/.bin/' + cmd, path + '/' + file].join(' '))
+}
+EOF
+} > "$tmp/list.js"
+list=$("$bare" "$tmp/list.js")
 fetched=0; kept=0; linked=0
 hex () { printf '%s' "${1#*-}" | base64 -d | od -An -v -tx1 | tr -d ' \n'; }
 printf '%s\n' "$list" | {
@@ -43,6 +56,10 @@ printf '%s\n' "$list" | {
         if [ "$(readlink "$dest" 2>/dev/null || true)" != "$target" ]; then
           mkdir -p "$(dirname "$dest")"; rm -rf "$dest"; ln -s "$target" "$dest"; linked=$((linked + 1))
         fi ;;
+      bin)
+        target=$(realpath -m --relative-to="$(dirname "$dest")" "$dev/$src")
+        mkdir -p "$(dirname "$dest")"; chmod +x "$dev/$src" 2>/dev/null || true
+        [ "$(readlink "$dest" 2>/dev/null || true)" = "$target" ] || { rm -f "$dest"; ln -s "$target" "$dest"; } ;;
       git)
         repo=${src#git+}; commit=${repo##*#}; repo=${repo%#*}
         repo=$(printf '%s' "$repo" | sed 's#^ssh://git@github.com/#https://github.com/#')
~~~~

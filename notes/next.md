# Handover: where the phase stands, and how to continue

Written 2026-11-01 after step 7, updated through 2026-11-07 (phase 3, step 2 built), for the next session (or after
compaction). Read this first, then `rules.md` (single concern first), then
`notes/plan.md`. Everything below is on `main`.

## Now: phase 3 closed (2026-11-08)

Report: `steps/phase-3/readme.md`; the last step's record:
`steps/phase-3/3-demos-again/readme.md`. The tenth release published and
checked by the local agent (below); its findings fixed on `main`, to go out
with the next packages; the human's browser check of the demos to come.
Next: the proposed phase, applications on mycelium repositories
(`notes/plan.md`), designed step by step with the human.

## The tenth release, published (2026-11-08, the human's word)

`setup-795612ec9e16`, latest, from `2e3eb0a`; the five repositories pushed. The
candidate failed at every node's container (Docker 28 refuses `--ip` on a
network made without a subnet); fixed here in `ensureNetwork` (`b8c975e`). Then
every count as below, locally and from GitHub. Record and findings:
`steps/phase-3/3-demos-again/local-run.md`. Waiting: the human's browser run
(step 4 below), then products and Codeberg with the human's word.

## For the local agent then: the tenth release (the human's OK, 2026-11-07)

Phase 3, step 2 (the demos again) is built: every part of the request,
every package's sets passing from a fresh install here (Node.js off the
PATH). Published nothing since the ninth release. On a machine with push
access to github.com/haiccing, from this repository at `main`:

1. `npm install` at the root (new dependencies since the ninth: `bare-http1`
   among them).
2. Publish: `sh steps/phase-3/1-packages-and-boot/5-validation/publish.sh
   <folder for the haiccing clones>`. Five repositories now:
   `base-package-haicc`, `base-package-pkgm`, `base-swarm-three-nodes`,
   `base-demo-liveness`, `base-demo-other-host` (the two demos' repositories
   exist from before: their contents are replaced by the new structure).
   The setup (`haicc-setup.sh`, about 39 MB: the stripped runtime only) is
   released on `base-package-haicc`.
3. From GitHub, in a new folder (the published setup, the default sources),
   Node.js off the PATH:
   `sh haicc-setup.sh <folder> && <folder>/boot`, then in it, each with its
   expected count:
   - `./haicc boot base-package-haicc/test` (6 passed; the platform test 24
     steps), `--set=validation` (2)
   - `./haicc boot base-swarm-three-nodes/test` (17; its deploy test 13
     steps), `--set=validation` (3)
   - `./haicc boot base-demo-liveness/test` (25; the demo 8 steps),
     `--set=validation` (2)
   - `./haicc boot base-demo-other-host/test` (25; the demo 9 steps),
     `--set=validation` (2)
4. By hand, with a browser:
   - `./haicc boot base-demo-liveness`: it says `its Splectral:
     http://127.0.0.1:4400`; open it: the map (master, node-1), the
     scenario's page; press Run: node-1 frozen, absent (a dashed ring), a
     request refused, back, a request answered, node-1 leaving.
     `docker ps` (two containers, `haicc-...-hosts-master`, `-node-1`);
     `./haicc teardown hosts --yes`: nothing left (`docker ps -a`, `docker
     network ls`).
   - `./haicc boot base-demo-other-host`: the same page; Run: host B
     invited, remote-1 joining (outlined: not host A's), a request across,
     a note written, remote-1 stopped. `./haicc teardown hosts --yes`.
   - `./haicc boot base-swarm-three-nodes`, `./haicc list`,
     `ls three-nodes/master/packages`, `docker logs` of the master's
     container, `./haicc teardown three-nodes --yes`.
5. Record the run (`local-run.md` in `steps/phase-3/3-demos-again/`), each
   finding with what was seen; commit on `pending/default` or as the human
   says.

## Now: phase 3, step 1, done with part 6; the local agent's turn

Phase 3, step 1 (packages and the boot): record
`steps/phase-3/1-packages-and-boot/` (parts 0 to 6), design
`notes/packages.md`, request
`pending/phase-3/step-1-packages-and-boot/request.md` on `pending/default`
(part 6 amended `0b57f73`).

- **The package manager** (`pkgm-base-manager`, Node's built-ins only):
  the import, packages written from `packages.json` and tested together,
  installs with overrides, tests within the package, changes recorded.
- **The work folder, one route** (part 6): the setup (`haicc-setup.sh`,
  `base-package-haicc`'s release), `haiccing/boot` (step 0, the
  repositories fetched from `haiccing/sources`, the package manager and
  HAICC into `.haicc`), `./haicc` for everything after, `manager/` for the
  deployments, logs in files from the start. Self-tested from a fresh work
  folder (exit 0; the script since removed, its log kept). `pkgm-base-boot`, the
  kicks and the demos' `run.sh` retired.
- **The local agent's first run** (`5-validation/local-run.md`): the demos
  published, both run from GitHub's archives; one open finding.

**Published: the fifth release (2026-11-06), the human's word.**
`setup-25a1bd107a92`, boot 0.6.0, latest; `base-package-haicc` `5b36fe6` on
GitHub. Run from the latest link with the default sources, through a node:
exit 0. **Only that repository went out**, the human's word: the other
`haiccing` repositories had generated text changes only and stay at their last
commits, so a node takes `base-package-pkgm` `cd28ada5126f` from GitHub, not the
`ec1e96858df7` this repository writes (same code). **The human tested it (2026-11-06)**: "the test worked well, looks really good".
Then, the human's word: the products (`haicc-base-boot` `7feda86`,
`haicc-deployment` `3b2bb7b`, `pkgm-base-manager` `7647b3b`), `haiccing`'s
profile (`8a14f40`, `./boot`). The implementer continues: the master's swarm,
and the three things below.

**The local agent, on boot and shutdown by level (2026-11-06).** Built and
tested: `setup-25a1bd107a92`, boot 0.6.0, from `001583e`; a new
folder through setup, `./boot`, a swarm, nodes, each shutdown and boot, each
teardown, `./shutdown`, `./boot` again: all exit 0, no hidden files. Fixed here:
a node's `./haicc list`, `version`, `fetch` and `install` crashed on paths from
before the new layout (`haicc-deployment/haicc.js`; a test added); `list` and
`version` now show the packages copied in. **For the implementer**, with the
package manager work:
1. In a node, `./haicc test <package>` says `no project` for the packages
   copied in: it reads the registry, which they are not in.
2. In a node, `./haicc install` still installs the old merged way, beside the
   whole copies: `packages/pear-full-square`, `packages/node_modules`, and each
   package listed twice (`base-package-haicc` and `haicc`).
3. `./haicc boot hosts/master` makes one swarm, `hosts-master`, and says so.
   The form `<swarm>/<node>` was dropped by the levels; a clear refusal would
   say more than a cleaned name.
   **Done (2026-11-06):** a path for a name is refused (exit 2, nothing
   made), naming the command to use: `hosts/haicc boot master`; a test added.

**The switch to Bare, at the start (2026-11-07, the human: Bare only,
`brittle` for tests, no Node.js equivalence)**: before the package manager
becomes the second package. The probe done:
`steps/phase-3/2-package-structure/2-bare-probe/` (20 of 22; what fails:
`fetch` over HTTPS through a proxy, so downloads stay in the shell; a
module's type comes from its folder's `package.json`). The sixth release's
finding fixed (a run's log in the source: removed, ignored, and the package
writer no longer carries a module's `log/`). Next, with the human's go:
`base-package-haicc` on Bare.

**The platform on Bare (2026-11-07)**: `base-package-haicc` runs on Bare
only (the runtime carried, placed at `bare/`; Bare's modules; `brittle`);
no Node.js on the host. `notes/packages.md`, "On Bare". From a fresh
release, Node.js off the PATH: 7 passed. **For the local agent, with the
human's OK: the seventh release**, as the sixth (`npm install` first: the
Bare modules and `brittle` are new dependencies; the package writer runs on
`tools/bare`): publish (`publish.sh`), then from GitHub in a new folder
`sh haicc-setup.sh <folder> && <folder>/boot && <folder>/haicc boot
base-package-haicc/test` (expect 7 passed; the setup is now 36 MB), and
`--set=validation` (2 passed); on a terminal: a yes asked and answered
(`./haicc boot` with git missing, or `./haicc teardown <swarm>` without
--yes), since reading the terminal moved to Bare. Record in
`steps/phase-3/2-package-structure/3-bare/local-run.md`. Then the package
manager as the second package, on Bare from the start.

**The human's manual tests, from now on (2026-11-07): from a local folder**, "as
my network connection is not good enough": the setup the local agent built
(`~/haiccing-publish/haicc-setup.sh`), not a download. The local agent still runs
the published release from GitHub.

**Published: the eighth release (2026-11-07), the human's word.**
`setup-ab3193778713`, Bare v1.36.0, latest; `base-package-haicc` `969a4cd`;
`haiccing`'s profile `3728924`. From GitHub: 7 passed, 2 passed; the human's
manual test from the local file: passed. Record:
`steps/phase-3/2-package-structure/3-bare/local-run.md`. Not pushed: the products,
Codeberg's mirror of `base-package-haicc`.

**Published: the ninth release (2026-11-07), the human's word.** `setup-434506b82414`,
latest; from GitHub 7 passed (23 steps), 2 passed; products and Codeberg done.
Before it, the candidate failed: Every real release's node refused itself: `LICENSE` in the copy,
not in the hash. Fixed in `packageHash`. `setup-434506b82414`: 7 passed, the
platform's 23 steps; the tamper checks as asked; the human's manual test from the
local file: passed. Next: step 3, with the human's go. Record and findings:
`steps/phase-3/2-package-structure/4-node-validated/local-run.md`.

**Built (2026-11-07), the first half of part 2: the platform as two
packages, refreshed at every root boot.** `base-package-pkgm` the package
manager's own package (26 MB, brittle included); `base-package-haicc` without
it (HAICC finds it beside it); the setup carries the pair (45 MB); the
root's boot fetches both again from the sources and deploys them (the
package manager's `deploy`: staged, intact, validated, in place); a node's
cold boot copies the pair afresh, its warm boot deploys it (so a swarm's
boot repairs a changed node); `./haicc sources` and `haiccing/sources.json`
(GitHub's listing through its API: not reachable from this sandbox,
untested here). From a fresh release, Node.js off the PATH: haicc's full set
6 passed (the platform's 23 steps), the swarm package's validation 3.
`publish.sh` publishes the three. The second half next: a package deployed
through the root (its swarm made from its configuration, its codebase
assembled into the master's repository).

**Part 5b built (2026-11-07): the other-host demo.** `base-demo-other-host`:
host A runs the swarm `hosts` (HAICC, containers); host B, a folder of its
own on this machine with its vault, joins remote-1 by invitation through
its node manager (`p2p-node-manager` on Bare, the previous implementation:
the user, HAICC is the outside), its code replicated from the master; a
request across, a note written over the management channel, stopped. Its
test `other-host` (9 steps, a fresh install) passes. With it, every part
of the phase's request is built; then the tenth release and the local
agent's check of everything.

**Parts 4 and 5a built (2026-11-07): Splectral on Bare; the liveness demo.**
`docs/design/platform.md`, "A swarm's Splectral". The generic Splectral
modules on Bare (the server on `bare-http1`); the p2p side on the new
structure (watchers: the containers' logs; actions: the node's HAICC,
Docker, a peer from the host); a swarm's Splectral server started and
stopped by its boot and shutdown. `base-demo-liveness`: the swarm `hosts`,
Splectral at http://127.0.0.1:4400; its test `liveness` (a fresh install,
the scenario played through the server, 8 steps) passes. Next: part 5b,
`base-demo-other-host` (a design to discuss first: what a second host is).

**No release until the phase's last part (the human, 2026-11-07)**: parts
4 and 5 are done first; then one release, the tenth, and the local agent's
check of everything at once (the lines "for the local agent" below are
folded into it).

**Part 3 built (2026-11-07): nodes running the swarm's codebase in
containers.** `docs/design/platform.md`, "A node runs the swarm's codebase,
in a container". A node's config `node.json` (its key in readable text,
kept while its folder is: the human, for now); its warm boot starts its
container (Debian base, Bare's stripped runtime, the master's
`packages/<package>/` mounted read-only, hardened); one Docker network per
swarm, labelled with the install. From a fresh release, Node.js off the
PATH: haicc full 6 (24 platform steps), `base-swarm-three-nodes` full 17
(its deploy test 13 steps: three containers, the nodes registered with the
master, a node's key kept across its shutdown and boot, nothing left in
Docker after teardown), validation 3. Then the stripped runtime only, at
the root too (the human): the setup about 39 MB. **For the local agent, with the human's OK**: the tenth release as
for part 2, and by hand `./haicc boot base-swarm-three-nodes`, `docker ps`,
`docker logs <master's container>`, `./haicc teardown three-nodes`. Then
part 4 (Splectral on Bare).

**Part 2 built (2026-11-07): a package deployed through the root.**
`./haicc boot <repo>[/<swarm>] [--from=<folder>] [--as=<name>]
[--strict]`: the package checked intact (from `--from` without a hash:
mixed, said); each swarm made from its configuration (its `.json` files
copied, its entry in `swarms.json`), then booted; again: from its own copy.
The master's build assembles the swarm's codebase into
`<swarm>/master/packages/<package>/` (every build; the human: the
master's, and the same name for the same kind of folder at every level). Strict is an option (the human): by default nodes are added
(`--role`) and torn down by hand; `--strict` refuses that. **For the local
agent, with the human's OK: the tenth release** (`npm install` first;
`publish.sh` publishes the three), tested from GitHub: haicc full,
`./haicc boot base-swarm-three-nodes/test`, `--set=validation`; then by
hand: `./haicc boot base-swarm-three-nodes`, `./haicc list`,
`ls three-nodes/master/packages`, `./haicc teardown three-nodes`. Then
part 3 (containers, `host.json`, the managers).

**Agreed (2026-11-07), the start of part 2: the platform as two packages,
refreshed from the sources at every root boot.** `docs/design/platform.md`:
`base-package-pkgm` the package manager's own package again (a concern of
its own); every level has both (the cold boot copies both in, the warm boot
has the package manager deploy both properly); the setup carries the pair as
a bootstrap; every root boot fetches both from the sources and redeploys
(root, then the nodes), nothing compared, nothing kept; the sources listed
into a manifest of their content; names switched by a shortcut link, later.

**Phase 3, step 2, the demos again (the phase's last): request
`pending/default:pending/phase-3/step-2-the-demos-again/request.md`.
Part 1 built (2026-11-07): `p2p` and `mycelium` on Bare.** The 13 modules
of the swarm's codebase (`mycelium-uri`, `-xpath`, `-git`, `-layer`,
`p2p-store`, `-dht`, `-connect`, `-replicate`, `-channel`, `-mrepo`, `-rns`,
`-node`, `splectral-p2p-observer`) and `mycelium-topic`, `mycelium-repo`:
Bare's own modules, tests on brittle (180 in the codebase's 13). The two
managers (`p2p-node-manager`, `p2p-swarm-manager`) wait for part 3
(containers: they are reworked there). `base-swarm-three-nodes` written by
the package writer (64 MB; its swarm's codebase assembles into a master's
repository, 166 tests passing there). From a fresh release, Node.js off the
PATH: haicc's full set 7 passed; `./haicc boot base-swarm-three-nodes/test`
(fetched from the sources) 16 passed, `--set=validation` 3 passed. Record:
`steps/phase-3/3-demos-again/1-p2p-mycelium/`. **For the human**: create
`haiccing/base-swarm-three-nodes`. **For the local agent, with the human's
OK**: the tenth release (`publish.sh` now publishes both packages; `npm
install` first), tested from GitHub: haicc's full set (6 passed since
part 2: the package manager's modules moved to `base-package-pkgm`), then
`./haicc boot base-swarm-three-nodes/test` (16 passed) and `--set=
validation` (3 passed). Then part 2.

**The ninth release's findings, done (2026-11-07)** (`setup-434506b82414`
published, 7 passed from GitHub, the human: "great, all passed"; the
candidate as handed over had failed, fixed by the local agent: the hash was
taken before the repository's `LICENSE` was back). 1 and 2: the `LICENSE` is
part of the package again: the writer puts it in (the repository's own,
else this repository's) before testing and hashing; `packageHash` counts it;
the writer's test checks it (a published repository's `LICENSE` there before
writing); a run with one, from a fresh setup: 7 passed. 3: durations on a
clock that never steps back (`bare-hrtime`; `/proc/uptime` in the shell).
**For the local agent, with the human's OK: the tenth release**, as the
ninth (`npm install` first: `bare-hrtime` is a new dependency).

**Step 2 built (2026-11-07): a node's boot, validated by the node itself.**
`notes/packages.md`, "Step 2". From a fresh release, Node.js off the PATH:
7 passed, the platform test 23 steps. **For the local agent, with the
human's OK: the ninth release, and the local test**: publish (`publish.sh`),
from GitHub `./haicc boot base-package-haicc/test` (7 passed); then by hand,
in a new work folder: `./haicc boot hosts`, `./hosts/haicc boot master`
(the master's warm boot: `base-package-haicc: intact (...)`, `modules-load`,
`sets`, `Ready: 3 test runs passed`); `./hosts/master/haicc test
base-package-haicc --set=validation`; a file replaced in the master's copy
(`rm` it, write a new one: never edit it in place, the copies are hard
links) and `./hosts/master/haicc boot` (not intact, said, not up);
`./hosts/haicc shutdown master --yes`, `./hosts/haicc boot master` (up
again). The human's manual test from the local file. Record in
`steps/phase-3/2-package-structure/4-node-validated/local-run.md`. Then
step 3, with the human's go.

**Next, agreed (2026-11-07), to start once the eighth release's report is
back and its findings are dealt with:**
- **Step 2: a node's boot, validated by the node itself.** Cold boot (the
  swarm's HAICC): the node's folder, the platform's code copied in
  (`base-package-haicc`: HAICC and the package manager, hard links), its
  launcher, then the warm boot. Warm boot (the node's own `./haicc boot`):
  each copied package intact (its contents' hash against its
  `package.json`'s, by the package manager's hashing: new) and working (its
  `validation` set); up only when both pass, else it says which and stops.
  On demand: `./<swarm>/<node>/haicc test base-package-haicc
  --set=validation`. The platform test gains the steps (a good node
  validated; a tampered file: said, not up, the swarm's boot stops). Then a
  local test (the local agent, the human).
- **The package manager stays in the platform's package** (the human): no
  separate `base-package-pkgm` for nodes; "the package manager as the second
  package" dropped from the plan.
- **Step 3: another haiccing package deployed into the master's repository
  from scratch**, with HAICC and the package manager: fetched from the
  sources, its swarm's codebase assembled into the master's repository,
  validated the same way. The package: `base-swarm-three-nodes` (the p2p
  node as its codebase), written on Bare: its modules' tests (p2p,
  mycelium) move to Bare and brittle with it.

**The local agent's findings on the seventh release, done (2026-11-07)**:
1. the runtime in the setup, not in git (the human's call): `release.sh
<package> <out> [<runtime>]`, pinned by its sha256, extracted to `bare/`,
checked; from the eighth release the package's tree no longer has it (the
seventh's 34.6 MB stay in the history: no force-push); the package 27 MB
(`bare-tls` 12 MB, brought by brittle's dependencies: to trim later); 2. the
published command removes an old `haicc-setup.sh` first (`curl -C -` would
append to it); within one run, curl's `--retry` restarts from zero (checked:
it does not resume), so the readme, the profile and `packages.json` say how to
resume on a poor connection: `curl -fL -C - -o haicc-setup.sh <url>` again
until it ends without an error (checked: it resumes); 3. `package-lock.json`
as npm writes it, committed; 4. a yes on a terminal: the record line to the
log only (the terminal shows the question and the answer); to a pipe, said;
5. each command echoed as called (the launchers and the stubs pass `$0`,
`HAICC_AS`). From a fresh setup, called by path from another folder, Node.js
off the PATH: 7 passed, 39 s. **For the local agent, with the human's OK: the
eighth release** (`npm install`, then `publish.sh`, which now passes this
repository's runtime to `release.sh`; the profile too: the live one still
says the boot checks Node.js), tested from GitHub (7 passed, 2 passed), and on
a real terminal a yes asked and answered (`./haicc teardown <swarm>` without
--yes: one line with the question and the answer). Record in
`steps/phase-3/2-package-structure/3-bare/local-run.md`.

**Published: the seventh release (2026-11-07), the human's word.**
`setup-bb5ab8f7a96d`, boot 0.6.0, latest; `base-package-haicc` `cb60f4b`, the
runtime in git as built. From GitHub: 7 passed and 2 passed; the human's manual
test: 7 passed. Findings, for the implementer:
`steps/phase-3/2-package-structure/3-bare/local-run.md` (the 92.6 MB runtime and
the human's proposal of a downloadable asset; the published `curl` not resuming;
`package-lock.json`; the prompt; the echoed command). Not pushed: `haiccing`'s
profile (the live one still says the boot checks Node.js), the products,
Codeberg's mirror of `base-package-haicc`.

**Done (below, seen working on the seventh release): the human's feedback on the
sixth release (2026-11-07): the commands are not on stdout.** "What I notice is that the commands are not
echoed into the stdout. That would be useful. Now I have to guess where the
commands are." The human's run chained setup, `./boot` and the test: their output
runs together, with nothing saying which command is running. Each command's
header goes to the log only.
1. **Each command says itself on stdout as it starts**: the command as run and
   its folder, as the log's header has it. Three places write that header:
   `lib/log.js` (both copies: `haicc-base-boot`, `haicc-deployment`), `boot.sh`,
   and the setup in `release.sh`.
2. **Nested commands too**: `<swarm>/haicc boot <node>`, a node's own boot.
   The `  | ` echo carries them; `--no-echo` keeps its outcome line.
3. **The tests' steps show what they run**: `test/platform/boot`'s `step` prints
   its description and keeps the output back, so a step's command can only be
   read in the source. Print the command with it (the work folder's path
   shortened, so a line stays readable).

The close line (exit code, duration) on stdout too is the implementer's to
propose. The local agent checks it on the next release.

**Done (2026-11-07)**: every command's header (`== <start> <command>  (in
<folder>)`) and close line (`== exit <code>, <time>`) on stdout as in the
log: `lib/log.js` (both copies; a command run by the root, `HAICC_NOLOG`,
says them without logging), `boot.sh`, the setup, `shutdown.sh`; a node's
HAICC names itself by its path (`./hosts/master/haicc`), the root's
`./haicc`, a swarm's `./hosts/haicc`. The platform test's steps: each its
command under it (`$ install/haicc boot hosts --no-echo ... ok`; the
install's path shortened to `install/`). The close line on stdout too: the
implementer's proposal, done; the human to say if it is too much.

**Published: the sixth release (2026-11-07), the human's word.**
`setup-25c91afc4801`, boot 0.6.0, latest; `base-package-haicc` `8ac17a0`. From
GitHub: 7 passed and 2 passed, as expected. One finding for the implementer, a
test run's log in the source and the release:
`steps/phase-3/2-package-structure/1-haicc/local-run.md`. The human's manual test
passed the same (7 passed). Not pushed: the products (`pear-full-square`), Codeberg's mirror of
`base-package-haicc`.

**Done (above): for the local agent (2026-11-07, the human's word): the sixth
release, created and tested before anything else.** From `main` at or after
`38ed4f9`, with this repository installed (`npm install` at its root):

1. Publish: `sh steps/phase-3/1-packages-and-boot/5-validation/publish.sh
   <folder for the haiccing clones>`. It writes `base-package-haicc` only, with
   the package writer (its tests first), in the new structure (`modules/`,
   `test/`, `platform/`), pushes it, builds `haicc-setup.sh` and uploads it as
   the release `setup-<hash>` (with `gh`).
2. Test the release as a user would, in a new folder, from GitHub:
   ```sh
   curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
   sh haicc-setup.sh ~/haicc-r6 && ~/haicc-r6/boot && ~/haicc-r6/haicc boot base-package-haicc/test
   ```
   Expect `Passed: 7 passed, 0 failed, 0 skipped` (the modules' tests,
   `modules-load`, `sets`, and `platform`: a fresh install inside its run,
   19 steps). Then `~/haicc-r6/haicc boot base-package-haicc/test --set=validation`
   (2 passed).
3. Record it in `steps/phase-3/2-package-structure/1-haicc/` (`local-run.md`:
   the release's tag, the commands, the result, anything found), commit,
   push, merge into `main`. Findings for the implementer, not fixed there.

Not part of it: `base-package-third-party` is no longer written (the human
archives it); the other packages come one a step, later.

**Tests on the platform (2026-11-07)**: a package's functionality booted
by its URI (`./haicc boot <repo>/test[/<test>]`, its cold boot, its
teardown); `base-package-haicc` carries its tests (`validation`, `full`,
the platform test); a downloaded release tests itself. `notes/packages.md`,
"Functionality" and "Built: step 1, haicc". Next: the package manager as
the second package, its tests booting node creation on the haicc platform;
waiting for the human's go.

**Step 1, haicc, built and tested on the platform (2026-11-07)**: the
package writer (`tools/package-writer`), the package manager's `assemble`
and bottom-up `test`, the new `base-package-haicc` (a node's cold boot: this
package only). `steps/phase-3/2-package-structure/1-haicc/run.sh`: 21 steps
passed. `notes/packages.md`, "Built: step 1, haicc". `packages.json`: haicc
only; `publish.sh` publishes `base-package-haicc` only. **For the human**:
`base-package-third-party` is no longer written (archive it). **Next**: the
package manager as the second package, its named tests deploying and
testing node creation on the haicc platform; waiting for the human's go.

**Next, agreed, not built (2026-11-07): the design reviewed and settled.**
Since the review: a package's `modules/` shared by its swarms, each swarm's
codebase its `modules.json`; the master's package repository assembled
from it, nodes using only that (a missing package fails); creating
packages is the development environment's (the other side of the
airgap), the package manager only installs and tests; stripped Bare in
production, the full one at the root. Step 1: the development tool
writing packages in the new structure; the package manager assembling a
swarm's codebase into a master's repository.

**Next, agreed, not built (2026-11-06): packages, platforms, swarms and
tests.** `notes/packages.md`, that section: a package's structure
(`modules/`, `swarms/<swarm>/` with one file a concern, `platform/`,
`test/<test>/` package-shaped); any package may carry the platform, one
platform per work folder, installs side by side in a parent folder;
`swarms/` in the work folder, a swarm only from a package, `--from` a
path; sources per package (`folder`, `git`, `github`), `contents.json` in
every packages folder, `swarms.json` fully qualified; test runs in
`swarms/test/<test>/`. Then the master's swarm. Waiting for the human's go.

**Now: boot and shutdown by level, built and tested (2026-11-06); next,
the master's swarm.** `notes/packages.md`, "Boot and shutdown by level".
A `haicc boot`/`shutdown` works on the config of the folder it is called
from: a node (its container, with the swarm's step), a swarm
(`<swarm>/nodes.json`: its nodes cold, rebuilt by its boot), the root
(`swarms.json`: each swarm); the work folder cold (`./boot`, `./shutdown`,
stubs at the top; kept: `haiccing/`, `log/`, `nodejs/`). One thing from its
parent: `./haicc boot|teardown <swarm>`, `<swarm>/haicc boot|teardown
<node>`. Tested from a fresh work folder: every level, both ways, each
teardown, `./shutdown` and `./boot` again; the boot tests pass (9).

**Before (superseded by the above): swarms and nodes on a host, and teardown, built and tested
(2026-11-06); next, the master's swarm.** `notes/packages.md`, "Swarms and
nodes on a host; teardown". `./haicc boot <swarm>/<node>` (or
`<swarm>/haicc boot <node>`): the swarm's folder (its launcher, the root's
HAICC in that swarm; `swarm.json`, its nodes and roles), the node's
manager with its own HAICC, its self-test. `teardown` for a node (leave,
shut down, contents removed, its HAICC kept), a swarm (master last), the
root (kept: `haiccing/`, `log/`, `nodejs/`). `node/` renamed `nodejs/`.
Tested from a fresh work folder: `Hosts/Master` made `hosts/master`,
node-1, `list`, each teardown, the root booted again. Leaving and shutting
down come with the swarm's step: deploying into the master.

**Now: the root install on the new shape, built (2026-11-06); next, the
swarm boot.** The root only (the human: not the package manager yet), boot
0.6.0, `haicc-base-boot`: the work folder `haicc`, `haiccing/`,
`packages/base-package-haicc/` (the repository copied whole at the first
boot; HAICC's root runs from it), `node/`, `log/`; `install/` gone, one
variable `HAICC_WORK`; the log on a timeline (files of 10 KB named by
their first command's start in UTC; each command's real start and its
duration, the setup's included); the instructions say `log/`, newest last.
Tested: the boot's tests 9 of 9 (the work folder's shape among them); a
fresh setup and boot, booted again, and rotated past 10 KB.
**For the local agent**, with the human's OK: publish `base-package-haicc`
and `haicc-base-boot`'s product, the fifth release (the setup, tag
`setup-<hash>`), `haiccing`'s profile; the human's local test as before
(the one command, the folder's shape, `ls log/`). The self-contained
packages and the package manager's side (`notes/packages.md`) wait for the
package manager work; the managers' HAICC (`haicc-deployment`) for the
swarm boot.

**Next here, first: the human's feedback on the fourth release (2026-11-06),
for a fifth.** The human ran it: "that works a lot better". Decided with them:

1. **The folders.** `packages` is the name for code modules, and `install/`
   blurred it: `install/haicc-base-boot/` outside any `packages` folder,
   `<manager>/install/packages/` a layer deeper than it needs, Node.js beside
   code, and `install/` against the file `haiccing/install`. The work folder
   becomes, the same shape at the root and in a manager:

   ```
   <work>/
     haicc        the launcher
     haiccing/    boot, sources, the repositories
     packages/    the code modules: haicc-base-boot (a manager's: all its packages, and pkgm/)
     node/        Node.js, when HAICC had to install it
     log/         the log files
     manager/     the same shape again
   ```

   `install/` goes. `HAICC_HOME` and `packagesFolder()` change meaning with it:
   what they point at is the implementer's to work out. Still no hidden folders.
2. **Each command in the log: a timestamp, and its duration at the end.** Not
   every line (the local agent's suggestion, not taken). The header has the real
   time of the command; its close line has how long it took. Today the shell's
   headers carry a made-up `.000Z`, and the setup's close line has no duration.
3. **Log files timestamped when written**, in their names, so the folder sorts
   on the timeline as it is listed: `ls log/` reads in time order. Today
   `haicc.log`, then `haicc.1.log`. Whether a file is one command, or stays
   rotated at 10 KB, the implementer's to propose; names in UTC, sorting as
   text. The instructions name the log's place, so they change with it (the
   readmes, `haiccing`'s profile; `notes/packages.md`).

Then to the local agent: products, packages, the release with the human's OK.
The local checks that were left stand: a failed download stopping the one
command; a boot without Node.js, through to the end, on a good connection.

**Now: the human tests the fourth release locally (2026-11-06).**
`setup-47f2b29b0194`, boot 0.5.0, published: findings 4 to 7 and no hidden
folders. Record: `steps/phase-3/1-packages-and-boot/6-work-folder/local-run.md`.
What the human checks: `notes/handover-packages.md`, "The fixes after the third
release", item 5. Tests: decided, not built (`notes/packages.md`, "Testing");
they come with the package manager work. The local machine's connection is
intermittent: a failed download there is the connection first.

**The first releases tested (2026-11-06)**: `6-work-folder/local-run.md`.
`setup-96cfc58bc18f` stopped at the first boot without Node.js;
`setup-58fb397be615` fixes it; `setup-b8c4a67a5e83` (boot 0.4.2, latest) says
what it is doing as it happens, and resumes downloads. Still to run: a
no-Node.js boot through to the end on a good connection. `pkgm-base-manager`'s count of tests is fixed here, not yet published:
goes with its next merge. Not done, the human's word: the demos' publishing
(they are behind `main`). **The human**: archive
`pear-full-square/pkgm-base-boot`.

**The root boot** (2026-11-06): the double boot, HAICC on Node.js alone,
its log (notes/packages.md, "a double boot"). **Next here**: the manager
boot (`haicc boot <manager>`), through the master's and a node's scenarios.

**Next here, also**:
- (done: the local run's finding 1, a node's shutdown with its
  prerequisites, `7-shutdown/`)
- the logs as topics (part 6's follow-on).

**Then** (`notes/packages.md`, "Later"): the p2p version (one code
repository per swarm, mirrored to the folder code runs from), pinning once
the system works, Android (a Termux probe by the local agent).

## Where it stands

Phase 2, the P2P swarm (the request: `pending/phase-2/request.md` on
`pending/default`). Steps, each with its request, parts and records:
`steps/` (index: `steps/readme.md`).

| Step | Status | Record |
|---|---|---|
| 0. Probes | done | `steps/0-probes/` |
| 1. Mycelium back to its own concern | done | `steps/1-mycelium/` |
| 2. The p2p series | done | `steps/2-p2p-series/` |
| 3. Repositories on the p2p layer | done | `steps/3-repositories/` |
| 4. The swarm: genesis | done | `steps/4-genesis/` |
| 5. A node joining | done | `steps/5-node-joining/` |
| 6. A node on another host | done (simulated on one machine) | `steps/6-other-host/` |
| 7. Splectral and data in topics | done | `steps/7-splectral/` |
| 8. Liveness | done | `steps/8-liveness/` |
| 9. Click and run | done | `steps/9-click-and-run/` |
| 10. The deployment on the swarm | done | `steps/10-deployment-on-swarm/` |

**What runs today.**
- A swarm manager on the host does genesis and adds nodes. Every node,
  the master included, is a hardened container provisioned by its own node
  manager through the auxiliary swarm (its secret into memory only), and
  keeps that link as its management channel.
- Joining nodes run the master's packages by replication. Requests in code
  are answered by every node. Everything is reached by URI
  (`/<swarm>/<node>/<name>`).
- A node on another host joins from an invitation (public facts only)
  under its own manager, vault and auxiliary network, on the one data plane
  all nodes reach. The swarm manager sees it but does not control it.
- **Data in topics**: the managers' records are Kafka records in topics
  (`mycelium-topic`); state is their fold.
- **An observer on every node** (`splectral-p2p-observer`) takes named
  actions from its manager, through the node's action topic and the
  management channel.
- **Splectral**: a browser platform showing hosts, nodes, resources and
  activity live, with the step 6 scenario as a demo, live and replayed,
  tested in headless Chromium. To run it locally:
  `steps/7-splectral/local-machine.md` (with a prompt for Claude Code).
- **Liveness** (step 8): p2p-rns holds a 15 s lease per node, renewed by
  the node's heartbeat; a silent node is flagged absent (records kept,
  flagged), present again when heard; a graceful stop leaves. Requesters
  refuse an absent node at once. Splectral shows presence; the scenario
  "A node goes quiet" (`base-demo-liveness`) freezes and thaws node-1.
  `steps/8-liveness/6-validation/demo.sh` runs it like step 7's.
- **Click and run** (step 9): a demo is a HAICC project
  (`haiccing/base-demo-liveness`, `base-demo-other-host`): `sh haicc
  start <project>` checks the machine, deploys and starts a test cluster
  with Splectral on top; Run in the browser, Run again any time (the
  project reconciled first); `stop`, `teardown`. `haicc-reconcile` (check,
  plan, make it so; non-strict by default, only what it owns) and
  `haicc-deployment` (the lifecycle as records). Splectral is spoken to
  through topics, has tabs, knows its project. How to run: `demos.md`.
- **The deployment on the swarm** (step 10): the master keeps the swarm's
  `deployment` repository (each change a commit), handed over at genesis
  and changed by request (`Deployment: set`); the swarm manager follows
  and shadows it, reports in manual mode, makes the substrate match in
  auto mode (`watch`); nodes shadow their managers. The demo projects
  declare the swarm's part (node-1); the watcher brings it up.
- **The folders are `<org>/<repo>`** (step 9): `pear-full-square/` the
  engines (all code), `splectral/` the components, `haiccing/` the
  projects, each folder its product repository.

## The design, where it is written

- **`rules.md`**: single concern first (one concern, one place;
  validation at the boundary; knowledge stays with its concern); branches
  and process; records and topics (Kafka records, Kafka's names); URIs;
  data names (lowerCamelCase, URI form with hyphens, `_` reserved).
- **`notes/node-pattern.md`**: the node, its provisioning, the host side,
  one data plane.
- **`notes/topics.md`**: data in topics: the record (partial Kafka record,
  data in `value`, metadata in `headers`), partitions, segments archived
  and sealed, the fold; records and objects as two levels.
- **`notes/splectral.md`**: Splectral as a platform (viewer first, then
  interaction, then applications); extensions; the abstract world;
  applications agnostic of p2p.
- **`vision.md`**: the directions. The organisations: `pear-full-square`
  is infrastructure (including Splectral's platform), `splectral` holds
  applications on it (named `<package>-<kind>-<name>`), and `splectrum` is
  the language medium (URI capabilities and AVRO as a DSL platform).
  Multi-paradigm data.
- **`notes/multi-swarm.md`**: vision only.

## Products

Every module has its product repository; every validated change is merged
(`notes/products.md`, step 7's table in
`steps/7-splectral/10-validation/products.md`).
- **`pear-full-square`**: the mycelium modules (`mycelium-uri`,
  `mycelium-git`, `mycelium-topic`, ...), the p2p series, `p2p-git`,
  `p2p-mrepo`, `p2p-rns`, `p2p-node`, the two managers, and the Splectral
  platform (`splectral-contract`, `-model`, `-transport`, `-server`,
  `-shell`, `-replay`, `-scenario`, `-timeline`, `-p2p-watchers`,
  `-p2p-actions`, `-p2p-observer`).
- **`splectral`**: `base-view-map`, `base-demo-other-host`,
  `base-demo-liveness`.

## Decisions waiting on the human

0. **The direction agreed for the next phase** (`notes/packages.md`):
   packages (`third-party`, `p2p`, `mycelium`, `splectral`, `haicc`; third-party
   code imported once; latest versions for now), cascading click and runs
   as `haiccing` projects with their own tests, then an Android skeleton
   node (a Termux probe, by the local agent). Phase 3, step 1 requested:
   `pending/phase-3/step-1-packages-and-boot/request.md` (`d5fbbcc`).
1. **What comes next: phase 2's request is met** (steps 0 to 10; the
   mapping in `notes/plan.md`). The next phase is the human's call.
   Candidates, from what is carried forward:
   - the nodes' audit cores (with Splectral's `repository` and `swarm`
     sources), so Splectral works across real machines;
   - interaction in Splectral, with identities and permissions (its
     actions start and stop swarms; who may change a deployment);
   - the deployment in Splectral; node types and configurations;
     `p2p-propagate` (several hosts' managers on one deployment);
   - several projects at once; the capability store and small runs; the
     repository-based versions; a real second machine; Pear with fixed
     versions; HAICC's project tool.
2. **The `haiccing` projects' product merges**: done 2026-11-02 by the
   local agent, from dev `04bcb84` (step 9's table in
   `steps/9-click-and-run/8-validation/products.md`). Later merges are
   plain, from a session that can attach them, or locally the same way.
3. **The human ran the demos locally** (2026-11-02, WSL2, Node 24): both
   projects started, ran, stopped and were torn down with `haicc`; "really
   good". Report and findings: `steps/9-click-and-run/demos-local-run.md`.
   Feedback on Splectral, noted for the vision (a platform for a
   solution's components, step by step; `vision.md`,
   `notes/splectral.md` open point 4), not asked for now: the demo app
   as a tab with its menu and components as tabs inside it; time on
   every screen. Step 10's deployment run by hand too: as recorded, but
   for the `shadow` phase's check, which reads record files in the
   filesystem's order (finding 7). Findings 1 to 4 and 7 fixed on
   2026-11-04 (`steps/10-deployment-on-swarm/8-local-run-fixes/`): `sh
   haicc` says when the dependencies don't resolve, the lockfile is clean,
   `demos.md` covers existing clones, the summary says the machine is all
   met, the shadow check reads the topic in order.

## Carried forward (open, not built)

- **From step 9** (all three of the local run's fixes are done):
  - a reconcile does not notice that a running swarm's image is older
    than the code (the image requirement builds the new one; the swarm
    keeps running the old until restarted);
  - selected requirements by node type and configuration (the shape is
    there: `type`, `config`);
  - Splectral's world is rebuilt from the managers' topics at its start,
    not from its runs: a restarted Splectral shows a scenario's runs from
    then on.
- **Liveness, what is left** (step 8): how long an absent node keeps its
  name (a second, longer timeout taking it out); the lease per swarm (a
  setting, 15 s today);  a link to an
  absent node drawn as open until the connection closes.
- **The nodes' audit cores**, and Splectral's `repository` and `swarm`
  sources: other hosts' nodes seen through the swarm (step 7).
- **Splectral**:
  - replay to a point in time (step 7's one wrong check compared
    different moments);
  - a scenario page showing the pages its steps name (`show`);
  - interaction with identities and permissions (designed in
    `notes/splectral.md`).
- **The node image**: it holds all the code, and since step 7 React and
  htm too (the workspace's one tree); an image with the join closure only.
- **Rebuilding a node's repositories from checkpoints**: a restart keeps
  identity, keys and ids, but loses what its repositories took in.
- **Admitting request writers** (intake records the sender, admits
  everyone).
- **The vault** is a stand-in (an owner-only file, not encrypted); release
  or sign.
- **Replication policy**; dedicated channels.
- **The invitation**: how it travels, signed by the master, address
  allocation on a shared data plane.
- **Topics** (`notes/topics.md`, open):
  - the header values' schema;
  - the segment policy;
  - offsets on a core;
  - batching;
  - which record properties come next (`key`, `timestamp`).
- **The repository-based versions** (roadmap):
  - p2p-rns on a repository;
  - the inbox as writer cores;
  - the capability store with gitlinks;
  - the swarm's record as a deployment repository.
- **Code loaded by replication runs from an exec tmpfs** (a recorded
  trade-off).

## How to work here

- **Rules**: `rules.md`, `CLAUDE.md`. Single concern first. Design first:
  discuss, then write what settles; the rules follow the design.
  - `main` changes only by plain merges from `execute/main`.
  - Never force-push.
  - Requests, and only requests, go on `pending/default`; outcomes and
    notes are data on `main`.
- **A step's cycle**:
  1. Its request on `pending/default`
     (`pending/phase-2/step-<n>-<name>/request.md`), written in a
     worktree of `pending/default` that is removed afterwards.
  2. The work on `execute/main`, part by part (`steps/<step>/<n-part>/`),
     committed as it goes.
  3. Unit tests and the step's validation, recorded with `steps/record.sh
     <step> <part> <case>=<command> ...`, or a `run.sh` that calls it.
     Run from the root, committed first (the unit names the dev commit).
     Never touch the tree while a recorded run is going: draft in the
     scratchpad.
  4. Findings in the part's readme, honestly, including what failed and
     why. Then the step's outcome, the plan's and `steps/readme.md`'s
     status, and the design notes where the design learns.
  5. Validated modules get new ids (`package.json`) and their product
     repositories are updated:
     - attach the repository (`add_repo`, push) and clone it;
     - `git subtree split --prefix=<org>/<module>`. Since step 9's move
       to `<org>/<repo>` folders, the first merge after the move is one
       join, `--allow-unrelated-histories`, no file changed; plain merges
       after;
     - plain merge into the product's `main`. The first time,
       `--allow-unrelated-histories`, and the product's LICENSE stays.
       For a product with an older history, take the folder's files.
     - push, verify against the remote, record in `notes/products.md`.
  6. Merge `execute/main` into `main`, and push `main`, `execute/main` and
     the session branch.
- **Commit messages**: first line the change; body why; `Request:
  <pending/default commit>:pending/phase-2/<step>/request.md`.
- **Modules**: folders on `main` at `<org>/<repo>`, as their product
  repositories (since step 9): `pear-full-square/` the engines,
  `splectral/` the components, `haiccing/` the projects.
  - The p2p series, the node, the managers and the Splectral modules are
    npm workspaces at the root: one dependency tree, with the root
    `package.json` carrying Bare's `bare-node-*` aliases.
  - The mycelium modules (and `mycelium-topic`, which has no dependencies)
    are imported by relative path.
  - Components (`splectral/base-*`) are folders with a `splectral.json`.
  - Unit tests: `sh steps/1-mycelium/validation/unit-tests.sh
    pear-full-square/<module>`.
- **Validation**: only where input enters, with `mycelium-uri`. Internal
  APIs trust their callers.

## Practical, in this cloud session

- `npm install` at the root needs `PUPPETEER_SKIP_DOWNLOAD=1` (p2p-git is a
  git dependency whose preparation pulls puppeteer).
- The Docker daemon is not running at start, and stops now and then:
  `(dockerd > /home/user/runs/dockerd.log 2>&1 &)`, then wait for
  `docker info`.
- Bare: `bare` on the PATH is npm's wrapper, which suppresses signals. For
  long-running processes on the host use the binary,
  `$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare`.
  Inside containers (`bare-base`) the binary is the runtime.
- Bare differences met:
  - no global `process` (import it);
  - `spawnSync` gives bytes;
  - `util` lacks `isDeepStrictEqual`;
  - asynchronous stdout loses a line written just before `process.exit`
    (write logs with `fs.writeSync`).
- Containers: native addons need an exec mount, and Docker's `--tmpfs` is
  noexec by default. The root is read-only, so `/tmp` is a tmpfs.
- Kill by pid files. Never `pkill -f` with a pattern that appears in the
  same command line: it kills the shell. Don't `rm` globs in shared
  folders (`/dev/shm`): use exact paths.
- Node's `http` server: `server.close()` waits for keep-alive connections
  (as `fetch` leaves them). Call `closeAllConnections()` too.
- Playwright and Chromium are preinstalled: `NODE_PATH=$(npm root -g)
  node <script>.cjs`. Screenshots can be shown to the human with
  SendUserFile.
- Long runs go in the background (`run_in_background`), followed with a
  Monitor on the record's `results.jsonl`, not with `sleep`.
- Scratch work goes in the session's scratchpad (outside the repository);
  records go into `steps/<step>/<part>/record/`.
- Images: `pear-full-square/p2p-node-manager/image/build.sh .` builds `bare-base:1.36.0`
  and `p2p-node:<commit>` from a committed tree.
- A demo for a try: `sh haicc start base-demo-liveness
  --work=<scratch>/live` (then `stop`, `teardown`; one project at a time).
  Its validation: `steps/9-click-and-run/8-validation/demo.sh` (phases in
  its header). A swarm on its own: `node
  pear-full-square/p2p-swarm-manager/cli.js genesis|join|start|stop-node|status|stop
  ...`. Always stop or tear down: containers and networks stay otherwise.
- This session cannot attach two repositories of the same name from
  different organisations (it checks them out by name): the `haiccing`
  projects' merges go through another session or by hand.

## To continue

"Read `notes/next.md` and continue." The next step is the human's call
(decisions above). Once chosen, write its request and follow the cycle.

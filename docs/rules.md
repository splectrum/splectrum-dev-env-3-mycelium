# Consistency rules

What every package, command, script and test of HAICC follows, so the
whole stays one thing. Each rule is short and checkable; where a rule is
checked by a test, the test is named. The reasons are in `design/`. (How to
work in this repository, branches, commits, URIs and data names: the root
`rules.md`.)

## Names and folders

1. **A name is a URI part**: lowercase letters, digits, single hyphens.
   A name given that is not one is cleaned into one, and the change said; a
   path where a name is expected is refused (exit 2), with the command to
   use. *(boot.test.js: a path for a name)*
2. **No hidden files or folders**, anywhere HAICC writes: everything in
   plain sight. *(the platform test, the release checks)*
3. **The folder is the context**: a level's `haicc` works on its own
   folder's config, and keeps it; there is no current-swarm setting.
4. **One concern per file**: a config file holds one thing (a swarm's nodes,
   its codebase, what Splectral shows, what the host provides).
5. **Records are fully qualified**: what a thing was made from (where, which
   hash) is recorded with it, not looked up later.

## Commands and output

6. **Every command says itself**: its header (`== <start> <command as
   called>  (in <folder>)`) and its close line (`== exit <code>, <seconds>
   s`), on stdout and in the log.
7. **Every line a command prints is in the log**, in order: the log of its
   level's folder, files of 10 KB named by their start. Nothing is printed
   that is not logged, nothing logged that was not printed (except a
   terminal question's answer, logged only: the terminal shows it).
8. **Every visible state change is said** (made, copied, removed, placed),
   with what it was done to.
9. **Exit codes**: 0 done; 1 not done, the output saying what is missing;
   2 a bad call.
10. **A child command is echoed**, each line marked `  | ` (or only its last
    line with `--no-echo`); a command run by the root does not log itself.
11. **Asked first**: a change outside the work folder (the host) or a
    removal needs a yes (`--yes` agrees in advance); with no terminal and no
    `--yes`, it is not done, and said.

## Packages

12. **A package is self-contained**: it carries everything it runs on (no
    `requires`, nothing resolved across packages); `brittle` included. The
    one exception: the platform's pair (HAICC uses the package manager from
    beside it, at every level).
13. **A package is written only by the package writer**, from this
    repository; never edited by hand where it is used. *(the writer's tests)*
14. **A package file is never edited in place** where it is used (copies
    are hard links): replaced, if anything, and then the package is no
    longer intact. *(the platform test)*
15. **A package is checked intact before it runs**: its hash against the
    one the writer recorded. *(a node's warm boot; pkgm.test.js: verify)*
16. **Third-party code enters only through the package writer**, from this
    repository's `node_modules`, recorded in `modules/third-party.json`.
17. **The package manager never writes a package**; the package writer is
    never shipped.

## Tests

18. **A package carries its tests**, at each level: each module's own
    (`test/`, on brittle), the package's named tests (`test/<test>/`), its
    swarms' (agreed). They run bottom up: modules, swarms, named tests.
19. **A test is a normal executable**: `test` (in place) or `boot` (booted),
    exit 0 when it passes; on Bare, sh for scripts.
20. **A test's categories and the sets agree**; every test is in a set.
    *(the `sets` test)*
21. **A test cleans up after itself**: a booted test is torn down on
    completion; one that changes what is outside its run repairs it, or
    declares it (`destroys`) and runs only with a yes.
22. **A test that cannot run is skipped and said**, never passed.
23. **A test never writes into its package**; its output goes to the log.
24. **A test that does not end is stopped, and fails** (10 minutes).
25. **Nothing is merged or released untested**: the full set from a fresh
    release, on Bare, Node.js off the PATH.

## Runtime and environment

26. **Bare only on the host**: Bare's own modules, no Node.js, no Node.js
    equivalence layer. **Downloads in the shell** (`curl`), never from Bare.
27. **The setup carries what HAICC runs on**; the boot downloads nothing.
28. **One platform per work folder**, the one it was set up from.
29. **Nothing is force-pushed**; what is published stays in the history.

## Documentation

30. **A decision lives once, in `design/`**, with its status (built /
    agreed) and why; a changed decision is changed there, not added beside.
    A rule lives here; a how-to in `guides/`.

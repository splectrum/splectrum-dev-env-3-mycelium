# Bare

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## Bare only

**Built.** The host side (the root's HAICC, a node's HAICC, the package
manager, the package writer) runs on Bare, on Bare's own modules
(`bare-fs`, `bare-path`, `bare-os`, `bare-process`, `bare-subprocess`,
`bare-url`, `bare-crypto`, `bare-tcp`, `bare-dgram`, `bare-tty`); tests on
`brittle`. No Node.js on the host, and no Node.js equivalence layer.
Downloads stay in the shell (`curl`).

*Why*: one runtime everywhere (the nodes already ran on Bare); switching at
the start of the rebuild, before more was built on Node.js (the human).
The probe that preceded it: `steps/phase-3/2-package-structure/2-bare-probe/`.

## The runtime is carried by the setup

**Built** (from the eighth release). The setup (`haicc-setup.sh`) carries
Bare's runtime, stripped (68 MB; below), pinned by its sha256; it is
extracted to `bare/` and checked; step 0 checks it runs on the host; every
launcher runs `bare`. The package's git does not carry it.

*Why*: no download at boot, so it works air-gapped; and not in git, where
one 92.6 MB file sat near GitHub's 100 MiB limit and every Bare upgrade
would have added to the history (the seventh release carried it; its 34.6
MB stay in the history: no force-push).

**Built** (part 3; the human, 2026-11-07, revises "the full one at the
root"): **the stripped runtime only**, for the root and the nodes'
containers alike. `release.sh` strips the published runtime (its version
said in the setup, and that it was stripped); 68 MB of the full one's 97
MB, the rest debug information; the setup about 39 MB.

*Why*: the two behave the same; debug information serves only a native
crash's diagnosis, which is the development side's (the full runtime is
in its `node_modules`; the containers dump no cores anyway).

## Copies within a work folder are hard links

**Built.** The platform's package in `packages/` and in each node is a hard
link copy of `haiccing/`'s: whole packages, no space taken twice.
Consequence: **a package file is never edited in place** (that would change
every copy, and the original); a file replaced breaks the link for that
copy only, and the package's hash says so.

## What Bare needs care with

**Built** (each found and handled):

- `console.log` does not go through `process.stdout`, and a stream's
  buffered output is lost to an exit: the log takes every line through one
  synchronous writer (in order, nothing lost); CLIs write their result with
  `writeSync` and end by themselves.
- `spawnSync` has no time limit (coreutils' `timeout` is used) and hangs
  when given `input` (not used).
- The environment object refuses `delete` (a variable is set to `''`).
- A module's type comes from its folder's `package.json` (`"type":
  "module"`), read once per folder: a named test outside `modules/` is
  `.mjs`, and imports by its path in the package.
- `brittle` takes paths relative to where it runs; its summary reads `#
  tests = 3/4 pass` (the package manager reads both forms).
- `bare-fetch` does not go through an HTTPS proxy: downloads stay in the
  shell.
- `readdirSync` lists a folder in directory order, unsorted (Node.js's
  comes sorted): code that relies on the order sorts.
- `brittle`'s `t.exception` rethrows native errors (`TypeError`, ...) as
  bugs; `t.exception.all` when one is expected.
- Bare 1.36 resolves `node:` imports itself; ours use Bare's own modules
  all the same (rule 26).
- npm leaves the runtime without its exec bit: the package writer and the
  release set it on their copies, never on npm's.

## brittle and its size

**Built.** Every package carries `brittle` (and its dependencies) because
its tests run on it: 74 modules, among them `bare-tls` (12 MB, native),
which HAICC itself does not use. **Agreed**: trimming it, later.

# Releases

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## The setup

**Built**. A release is one self-extracting
file, `haicc-setup.sh` (`sh` and `tar` only), made by `release.sh` from the
platform's packages as written and Bare's runtime. Agreed (the human,
2026-11-07): it carries the platform's pair, HAICC and the package manager,
as a bootstrap: sufficient to install packages; the root's boot refreshes
both from the sources. Once stable, a release does not change: a new one only
when the bootstrap itself must (Bare's runtime, say). It extracts a work
folder: `boot` and `shutdown` (the stubs naming this setup), `bare/` (the
runtime, checked against its sha256), `haiccing/sources`,
`haiccing/base-package-haicc/`. Run again on the same folder: said, nothing
changed; with another setup: refused, "use a new folder". It logs to the
work folder's `log/` from its first line.

The release is stored once, clean: as the GitHub release of
`base-package-haicc` (tag `setup-<hash>`), the setup as its asset; no copies
in this repository.

## Downloading it

**Built.** The published command removes an old `haicc-setup.sh` first and
downloads with `curl --retry` (a dropped connection restarts within the
run); on a poor connection, `curl -fL -C - -o haicc-setup.sh <url>` run
again continues a stopped download. `sh haicc-setup.sh <folder> &&
<folder>/boot && <folder>/haicc boot base-package-haicc/test` tests the
release where it lands.

## Publishing, and who tests what

**Built.**

- **The implementer** (a cloud session) builds and tests from this
  repository: the package writer, a release built from it, a fresh work
  folder, the full set, Node.js off the PATH.
- **The local agent** publishes, with the human's OK: `publish.sh` (the
  package writer's packages pushed to their haiccing repositories, the
  setup built and uploaded as the release), then tests the published
  release from GitHub in a new folder, and records it in the step's
  `local-run.md`, findings for the implementer.
- **The human** tests by hand, from the setup file the local agent built
  (the human's connection makes downloads slow), and says what they see.
- **Nothing is force-pushed**; what is published stays in the history.

Each release so far, with its tag and result: `notes/next.md` and the
steps' `local-run.md`.

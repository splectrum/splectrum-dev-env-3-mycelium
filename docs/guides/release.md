# Publishing a release, and checking it

For the local agent (a machine with push access to the `haiccing`
organisation and `gh`), with the human's OK for each release.

## 1. Publish

From this repository at the commit to publish, its changes committed:

```bash
npm install
sh steps/phase-3/1-packages-and-boot/5-validation/publish.sh <folder for the haiccing clones> [--no-push]
```

It clones each published repository into the folder (if not there), writes
the packages with the package writer (all tested first: nothing written if a
test fails), commits and pushes each that changed, builds `haicc-setup.sh`
(with this repository's Bare runtime) and uploads it as the release
`setup-<hash>` of `base-package-haicc`. `--no-push`: everything but the push
and the upload, to check first.

Never force-push. A file GitHub warns about (over 50 MB) is said to the
human before pushing.

## 2. Check it, as a user would

Before publishing (`--no-push`), the built file in a new folder, Node.js off
the PATH, called by path from another folder:

```bash
sh <folder>/haicc-setup.sh <new folder> && <new folder>/boot && <new folder>/haicc boot base-package-haicc/test
<new folder>/haicc boot base-package-haicc/test --set=validation
```

After publishing, the same from GitHub, with the commands exactly as the
profile shows them (`guides/install.md`), in a new folder.

Expect `Passed: 7 passed` and `Passed: 2 passed`. Look too for: no hidden
files; the commands said on stdout; a swarm and a master up; `./shutdown`
and `./boot` again.

## 3. Record it

In the step's folder (`steps/.../local-run.md`): the tag, where from, the
commands, each result, what was not checked, and findings for the
implementer (not fixed there). Then `notes/next.md` (published, or not and
why), commit, push, merge into `main`.

## 4. The human's manual test

From the setup file the local agent built (`~/haiccing-publish/
haicc-setup.sh`): set up, boot, the full set; what they see recorded under
"The human's manual test" in the same `local-run.md`.

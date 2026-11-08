# Handover: the haiccing projects' first product merge

For a Claude Code agent running locally, on a machine with git and access to
the GitHub organisation `haiccing`. Written 2026-11-02 after step 9. Read
this, do it, report back; nothing else in this repository needs changing.

## Why it is done locally

Step 9 made two HAICC projects, folders of this repository:
`haiccing/base-demo-liveness/` and `haiccing/base-demo-other-host/`. Each
has its product repository, created by the human:
`https://github.com/haiccing/base-demo-liveness` and
`https://github.com/haiccing/base-demo-other-host`. The cloud session could
not attach them: it checks repositories out by name alone, and the
`splectral` components of the same names (`splectral/base-demo-liveness`,
`splectral/base-demo-other-host`) were attached. The names are shared on
purpose: a project and its component belong together.

## What the merge is

The project folder's history, split out of this repository, merged into its
product repository's `main`. The first merge joins two unrelated histories
(the product holds only its initial commit with a LICENSE): the LICENSE
stays, the folder's files come in. Plain merges after this one. Never
force-push.

## Steps

Work in an empty folder of your own, e.g. `~/haiccing-merge`.

1. Clone this repository (or use an existing clone) and bring `main` up to
   date:

   ```bash
   git clone https://github.com/splectrum/dev-env-2-p2p-cluster.git
   ```

   ```bash
   git -C dev-env-2-p2p-cluster checkout main && git -C dev-env-2-p2p-cluster pull --ff-only
   ```

2. For each project, `<p>` = `base-demo-liveness`, then
   `base-demo-other-host`:

   a. Split the folder's history onto a local branch:

   ```bash
   git -C dev-env-2-p2p-cluster subtree split --prefix=haiccing/<p> -b split-<p>
   ```

   b. Clone the product repository and merge the split into it:

   ```bash
   git clone https://github.com/haiccing/<p>.git
   ```

   ```bash
   git -C <p> pull --no-rebase --allow-unrelated-histories --no-edit ../dev-env-2-p2p-cluster split-<p>
   ```

   c. Check: the product holds the folder's files and its LICENSE, and
   nothing else differs (this prints only `LICENSE`):

   ```bash
   git -C <p> diff --name-only split-<p> HEAD 2>/dev/null || git -C <p> diff --name-only FETCH_HEAD HEAD
   ```

   Expected files: `LICENSE`, `README.md`, `project.json`.

   `--no-rebase` makes it a merge where git asks how to reconcile divergent
   branches (git 2.27 and later, without `pull.rebase` set). `--no-edit`
   names the local path in the message: give the merge a message of the
   products' form before pushing,
   `git -C <p> commit --amend -m "Merge <p> from dev-env-2-p2p-cluster <dev commit> (first merge)"`.

   d. Push and verify against the remote:

   ```bash
   git -C <p> push origin main
   ```

   ```bash
   git -C <p> fetch origin && test "$(git -C <p> rev-parse HEAD)" = "$(git -C <p> rev-parse origin/main)" && echo verified
   ```

3. Report back to the human: for each project, the split head
   (`git -C dev-env-2-p2p-cluster rev-parse --short split-<p>`) and the
   product's merge commit (`git -C <p> rev-parse --short HEAD`).

## After

The human brings the two commits back to the cloud session, which records
them in `steps/9-click-and-run/8-validation/products.md` and
`notes/products.md`. Or, if the local agent may push to this repository:
add the two rows to that table (`| \`base-demo-liveness\` |
\`haiccing/base-demo-liveness\` | <split> | <commit> | first merge |`),
replace its "Waiting" section by a line saying when they were merged, and
commit on `execute/main`, then merge into `main` (a plain merge, never a
force-push), and push both.

## Don't

- Don't run the demos as part of this (that is `demos.md`, separately).
- Don't force-push, don't rewrite history, don't touch the `splectral`
  repositories of the same names.
- The local branches `split-<p>` can be deleted afterwards.

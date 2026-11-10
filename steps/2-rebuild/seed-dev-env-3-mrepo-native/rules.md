# Rules (draft)

## The repository is a mycelium repository

- Its layers are git branches, disjoint, never merged into each other
  (`docs/design/repositories.md`, "Layers"): `main` (its data: here, the
  source it develops), `packages` (the bundles it runs, their addons by
  hash, the signed manifest), `runtime` (the runtime's data: the service
  state, the type's API), `request/pending/default`, `request/execute`,
  `request/done` (its requests and their records), and the execution
  branches `execute/<target>` (made from their target, merged back into
  it).
- All on the filesystem: the native backend (git itself), the repository
  a bare clone; nothing reads a working tree. Read a layer with git
  (`git show <layer>:<path>`) or with a `get` request.
- Every change is a request, once the runtime runs: posted to its inbox,
  checked against its API, queued, executed in execution branches, merged,
  recorded in `request/done`, answered. Code never runs from `main`: it
  runs from the bundles in `packages`.

## Sync

- Pushing is the sync (as replication or export on p2p), outside the
  requests: `git push origin --all`, every layer, at checkpoints. A new
  session clones it back (`git clone --bare`).
- One runtime writes the repository at a time: a session takes over by
  cloning the latest and hands back by pushing before another starts.
  Nothing is ever force-pushed.

## Commit messages

- First line: the state change. Body: the request it answers and why,
  briefly. The runtime's own commits name their request.

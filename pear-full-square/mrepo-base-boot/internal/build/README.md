# build

Builds an mrepo from its structure: a folder laid out by layers, a `layer.json` at each leaf.

The repository is written on the filesystem storage, p2p-git's hybrid with
every layer on disk: one orphan branch a leaf, its files one commit,
`layer.json` among them. The inbox's and the outbox's folders are made.

## Signature

`build({ from, work, name, dir, time, setting })`

- `from`: the structure folder.
- `work` and `name`: written at `<work>/mrepos/<name>/`; or `dir`: there,
  a child inside its parent.
- `time`: seconds, every commit's, so the same folder builds the same
  repository.
- `setting`: `false` writes no `<work>/mrepo.json`, for a child.

## Returns

`{ name, dir, layers: { <layer>: <commit> } }`.

## Errors

The repository exists already.

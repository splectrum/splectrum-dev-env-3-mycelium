# resolve

Resolves a local URI to a node position in an mrepo and says whether it is an ordinary node or a shortcut.

A shortcut is a node whose data originates elsewhere: another mrepo, linked
at that position. Its entry is in the `xpath` layer, at the position's own
path. Only the mrepo that owns a shortcut knows it is one.

## Signature

`resolve(exec, uri)`: `exec` reads the mrepo, `exec.read(path)`; `uri` is
local to it, its segments as a request's form holds it, and addresses a
position in `main`: `["main", "."]`, `["main", "host"]`. `["."]` is the
mrepo itself, above its layers: no shortcut there.

## Returns

`{ at, shortcut }`: `at` is the position as written at `main`: `.`,
`host`. `shortcut` is `null` for an
ordinary node. For a shortcut it is its entry and where it leads:

```
{ at, mrepo, ..., folder, dir }
```

- `mrepo`: the linked mrepo's unique URI.
- `folder`: its folder, relative to this mrepo's: `main/<position>`.
- `dir`: the same, absolute, when the context names this mrepo's folder.

## Errors

- The URI is not an array of segments, a segment is not canonical or
  has a leading slash.
- The URI is not in `main`.
- The URI runs through a shortcut: a URI stays inside its mrepo. The
  message names the shortcut and the way across, a `haicc` at it.

## Design

- **Local linking only.** The linked mrepo's folder is found by logic:
  the `main/` folder on disk is a shadow structure of `main`, and what is
  linked at a position sits there at the same path, its inbox and outbox
  folders inside.
- **No presence in main.** A shortcut is its entry in the `xpath` layer and
  nothing else.
- **Own shortcuts only.** An mrepo resolves its own. Those of a linked
  mrepo are not visible from here.

## Also exported

- `shortcutOf(position)`: the entry's path, `/xpath/<position>/shortcut.json`,
  for a position as written at `main`.
- `shadowOf(position)`: the position's folder in the shadow of `main`.
- `IDENTITY`: `/runtime/mrepo.json`, an mrepo's own `{ uri }`.
- `swarmOf(uri)`: the swarm of a unique URI, `local` when it has none.
- `uriOf(parent, name)`: the unique URI of an mrepo linked at a name, in
  its parent's swarm.

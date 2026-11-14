# /xpath

The mrepo's navigation directives: its shortcuts, each at the path of its position.

A shortcut is a node whose data originates elsewhere: another mrepo, linked
at that position. It has no presence in `main`; its entry here is all
there is of it. The layer is atomic, and internal: it stays on disk.

```
/xpath/<position>/shortcut.json     { "mrepo": "local/host", ... }
```

## Shortcuts

- **`mrepo`**: the linked mrepo's unique URI.
- **The rest** is what the boot protocol recorded when it deployed the
  mrepo there: the package it was deployed from, its packages, its
  runtime's process.
- **Managed by the boot protocol**: `boot deploy` creates the entry,
  `boot teardown` deletes it.

## Resolving

A URI is resolved inside the mrepo it is in, by the runtime's XPath
(`mrepo-base-xpath`): a position is a shortcut exactly when it has an
entry here.

- **Local linking only.** The linked mrepo's folder is found by logic: the
  `main/` folder on disk is a shadow structure of `main`, and what is
  linked at a position sits there at the same path, with its inbox and
  outbox folders inside. The shortcut at `host` leads to
  `<dir>/main/host/`.
- **A URI does not run through a shortcut.** `host/packages` is not
  resolved. The way across is a `haicc` at the shortcut:
  `haicc host help/get . packages`.
- **Own shortcuts only.** An mrepo resolves its own; those of a linked
  mrepo are not visible from here.

## Later

The main data of a linked mrepo seen through its shortcut, as local nodes,
without that mrepo's own shortcut data.

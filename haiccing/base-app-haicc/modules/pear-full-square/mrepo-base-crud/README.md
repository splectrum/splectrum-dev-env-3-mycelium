# mrepo-base-crud

The mrepo crud protocol: an mrepo's nodes created, read and deleted by URI.

The generic actions on an mrepo's data, for putting structure into
`main`. A node is a folder holding its document; a URI names one, or with
`*` as its last name part its children. There is no update. Offered by
`haiccing/base-package-crud`.

| | |
|---|---|
| [external/](external/) | the crud protocol's actions |
| [internal/](internal/) | a node as it is stored, the nodes a URI selects |
| [test/](test/) | its tests |

## Commands

```
haicc . crud/create swarms/swarm-1 {"size":3}
haicc . crud/read swarms
haicc . crud/read swarms/*
haicc . crud/delete swarms recurse
```

## Rules

- **Idempotent**: repeating a request is safe. `create` leaves a node
  that is there as it is; `delete` of one that is not there selects
  nothing and succeeds.
- **A selection is an array**: `read` and `delete` answer with the nodes
  selected, none included; nothing there is not an error.
- **Main from outside**: a request from outside names nodes in `main`.
  The mrepo's own requests name the layer first and may work on another
  layer; each such change is then a request, audited.
- **A shortcut is a node**: read, it says where its data comes from;
  deleted, the link goes, not what it leads to. A URI does not run
  through it.

## Config

`CONFIG`, in `internal/config.js`: the three actions anywhere in `main`;
`create` and `delete` need a target, the layer itself is neither made nor
removed.

## Tests

- `npm test`: the actions on an execution written for them.

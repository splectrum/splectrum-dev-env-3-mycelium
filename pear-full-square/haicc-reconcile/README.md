# haicc-reconcile

Declare what a module needs; check it, plan it, make it so. HAICC's
reconcile engine, its deployment stage (design: `notes/haicc-reconcile.md`
in the development repository).

```js
import { createEngine, providers } from 'haicc-reconcile'
const e = createEngine({ providers: { ...providers, ...more }, owner: 'my-project', record })
await e.check(requirements)               // met | missing | different | blocked | extra, fixable or not, hints
await e.plan(requirements, { strict })    // what apply would do
await e.apply(requirements, { strict })   // do it, then check again; idempotent
await e.remove(requirements)              // what this owner made, taken away, dependents first
```

```sh
node cli.js check|plan|apply|remove <declaration.json> [--strict]
```

- **A requirement**: `{ name, kind, want, needs }`. Named, or selected
  (a kind's provider may take a type and a count in `want`).
- **A provider per kind**, the only place knowing it: `observe`,
  `compare`, and for kinds it may create `create`, `owned`, `remove`;
  `hint` for what only a human can fix; `extras` for what is there and not
  declared.
- **Non-strict by default**: extras are reported and left. **Strict**
  also removes extras it owns. **Only what it owns**, in both.
- **A need not met and not fixable blocks** what needs it (`blocked`).
- **Records**: every check and action to `record` (the command: a topic,
  `mycelium-topic`).

**Generic providers.** Checked only, with hints: `os`, `docker` (Engine,
rootful, not Desktop), `bare` (the runtime images are
built with), `subnet` (free, or held by a named network), `udp` (a
container reaches the host on a network), `port` (free, or held by the
process in a pid file). Created: `folder` (marked as its owner's).

A declaration file: `{ owner, providers: [modules], requirements, strict,
record }`, `{here}` standing for its folder.

`npm test`: 4 tests.

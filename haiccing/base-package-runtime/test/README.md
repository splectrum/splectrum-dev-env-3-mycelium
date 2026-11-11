# test/

The runtime package's tests.

| set | runs |
|---|---|
| `validate` | `start`: the package as deployed |
| `full` | `start`, then `modules`: every carried module's own tests (the generic modules test), on the package's copies |

| | |
|---|---|
| [start/](start/) | the runtime started over an mrepo, answering, stopped |

## Running

```sh
bare test/run.js [<set>]                 from the package's folder (validate by default)
bare <bundle> /test/<target> [--dry-run] from its bundle: in a floating instance
```

In a running mrepo that links the package: `runtime run
/packages/haiccing/base-package-runtime/test/<target>`, body `{ "dryRun": true }` to
see what would run. Each unit its own process; the result returned (one
line, JSON, last): `{ target, ok, units: [{ unit, ok, tests, asserts,
failures }] }`. Exit 0 all passed, 1 one failed, 2 no such set.

The targets, the generic modules test, the floating instance:
`haiccing/package-docs-template`, `test/`.

# test/

The boot package's tests.

| set | runs |
|---|---|
| `validate` | `boot`: the package as deployed |
| `full` | `boot`, then `modules`: every carried module's own tests (the generic modules test), on the package's copies |

| | |
|---|---|
| [boot/](boot/) | the boot, end to end: prerequisites, the boot mrepo, its runtime, the host deployed, redeployed, torn down, deployed again; the runtime protocol |

`SOURCES`: the sources folder (the runtime's and the boot's bundles, the
pinned Bare's tarball); else the development repository's `sources/`.
Without it, the tests that need it are skipped.

## Running

```sh
bare test/run.js [<set>]                 from the package's folder (validate by default)
bare <bundle> /test/<target> [--dry-run] from its bundle: in a floating instance
```

In a running mrepo that links the package: `runtime run
/packages/haiccing/base-package-boot/test/<target>`, body `{ "dryRun": true }` to
see what would run. Each unit its own process; the result returned (one
line, JSON, last): `{ target, ok, units: [{ unit, ok, tests, asserts,
failures }] }`. Exit 0 all passed, 1 one failed, 2 no such set.

The targets, the generic modules test, the floating instance:
`haiccing/package-docs-template`, `test/`.

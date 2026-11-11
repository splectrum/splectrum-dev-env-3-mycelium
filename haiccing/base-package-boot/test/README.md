# test/

The boot package's tests: its sets and its one test, `boot`.

| set | tests |
|---|---|
| `validate` | `boot` |
| `full` | `boot`, `modules` |

| | |
|---|---|
| [boot/](boot/) | the boot end to end: prerequisites, the boot mrepo and its runtime, the host deployed, redeployed, torn down, deployed again; the runtime protocol |

`SOURCES`: the sources folder `boot/` needs (the runtime's and the boot's
bundles, the pinned Bare's tarball); else the development repository's
`sources/`; without it, skipped.

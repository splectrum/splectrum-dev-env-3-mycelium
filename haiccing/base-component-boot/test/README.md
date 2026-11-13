# test/

The boot component's tests: its sets and its one test, `boot`.

| set | tests |
|---|---|
| `validate` | `boot`, `help`, `code`, `mrepo`, `package` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `boot`, `help`, `code`, `mrepo`, `package`, `modules` |

| | |
|---|---|
| [boot/](boot/) | the boot end to end: the boot mrepo and its runtime, the host deployed by a command, redeployed, torn down, deployed again; haicc; the runtime protocol |

`SOURCES`: the sources folder `boot/` needs (the packages' bundles, this
component's among them); else the development repository's `sources/`;
without it, skipped.

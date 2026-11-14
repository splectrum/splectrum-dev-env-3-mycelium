# test/

The boot component's tests: one of its own, `boot`, and the generic ones, a folder each.

| | |
|---|---|
| [boot/](boot/) | its own: the boot end to end: the boot mrepo and its runtime, the host deployed by a command, redeployed, torn down, deployed again; haicc; the runtime protocol |
| [help/](help/) | generic: the READMEs against the README rules |
| [code/](code/) | generic: the code against the code rules |
| [mrepo/](mrepo/) | generic: the integrity of the mrepo side |
| [package/](package/) | generic: the package against the template's structure |
| [modules/](modules/) | generic: every carried module's own tests |
| [help-in-situ/](help-in-situ/) | generic: the help where it is deployed |
| [mrepo-in-situ/](mrepo-in-situ/) | generic: the package as a running mrepo holds it |

## Sets

| set | tests |
|---|---|
| `validate` | `boot`, `help`, `code`, `mrepo`, `package` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `boot`, `help`, `code`, `mrepo`, `package`, `modules` |

## Sources

`SOURCES`: the sources folder `boot/` needs (the packages' bundles, this
component's among them); else the development repository's `sources/`;
without it, skipped.

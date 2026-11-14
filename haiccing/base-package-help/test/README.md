# test/

The help package's tests: one of its own, `mounted`, and the generic ones, a folder each.

| | |
|---|---|
| [mounted/](mounted/) | its own: the protocol as mounted, its config, its layer and its actions, without an mrepo |
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
| `validate` | `mounted`, `help`, `code`, `mrepo`, `package` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `mounted`, `help`, `code`, `mrepo`, `package`, `modules` |

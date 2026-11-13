# test/

The documentation package's tests: the generic ones, a folder each, and its explicit entry for none of its own.

| | |
|---|---|
| [none/](none/) | its own: nothing specific to the package needs testing, said explicitly |
| [help/](help/) | the READMEs against the README rules |
| [code/](code/) | the code against the code rules |
| [mrepo/](mrepo/) | the integrity of the mrepo side |
| [package/](package/) | the package against the template's structure |
| [modules/](modules/) | every carried module's own tests |
| [help-in-situ/](help-in-situ/) | the help where it is deployed |
| [mrepo-in-situ/](mrepo-in-situ/) | the package as a running mrepo holds it |

## Sets

| set | tests |
|---|---|
| `validate` | `none`, `help`, `code`, `mrepo`, `package` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `none`, `help`, `code`, `mrepo`, `package`, `modules` |

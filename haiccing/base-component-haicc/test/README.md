# test/

The haicc component's tests: the generic ones.

| set | tests |
|---|---|
| `validate` | `help`, `code`, `mrepo` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `help`, `code`, `mrepo`, `modules` |

The component deployed, its service started, a node deployed inside it and
commands chained through both are tested by the boot package, which can
deploy one; from the command line, by `base-linux-haicc`.

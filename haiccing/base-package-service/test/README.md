# test/

The service package's tests: the generic ones, and its module's own.

| set | tests |
|---|---|
| `validate` | `help`, `code`, `mrepo` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `help`, `code`, `mrepo`, `modules` |

The service in a deployed mrepo, its gate and its states, is tested by the
boot package, which can deploy one.

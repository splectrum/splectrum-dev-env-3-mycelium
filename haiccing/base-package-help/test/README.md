# test/

The help package's tests: the generic ones, and its module's own.

| set | tests |
|---|---|
| `validate` | `help`, `code`, `mrepo` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `help`, `code`, `mrepo`, `modules` |

The help of a running mrepo, extracted and read by commands, is tested by
the boot package, which can deploy one.

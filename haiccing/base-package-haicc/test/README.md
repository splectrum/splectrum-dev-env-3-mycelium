# test/

The haicc package's tests: the generic ones, and its module's own.

| set | tests |
|---|---|
| `validate` | `help`, `code`, `mrepo` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `help`, `code`, `mrepo`, `modules` |

A command sent on through a shortcut, between running mrepos, is tested by
the boot package, which can deploy one.

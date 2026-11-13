# test/

The boot package's tests: the generic ones, and its module's own.

| set | tests |
|---|---|
| `validate` | `help`, `code`, `mrepo` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `help`, `code`, `mrepo`, `modules` |

The boot protocol between running mrepos, a host deployed, redeployed and
torn down by commands, is tested by `haiccing/base-component-boot`.

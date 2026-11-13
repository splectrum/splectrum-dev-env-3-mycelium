# test/

The protocol package's tests: the generic ones, and its module's own.

| set | tests |
|---|---|
| `validate` | `help`, `code`, `mrepo` |
| `validate-in-situ` | `help-in-situ`, `mrepo-in-situ`: run in a running mrepo with `runtime run` |
| `full` | `help`, `code`, `mrepo`, `modules` |

Protocols activated by hooks in running mrepos, at boot and on the
service's transitions, are tested by `haiccing/base-component-boot`.

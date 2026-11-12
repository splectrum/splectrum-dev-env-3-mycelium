# validate/

Tests every package carrying this module runs on itself, not the module's own tests.

The package's dispatcher adds them as units of its own: `/test/help` and
`/test/help-in-situ`.

## `help.test.js`

The package's help, extracted from its own files as a runtime would, has
no problems against the README rules. Run in a floating instance.

## `help-in-situ.test.js`

The package's help, as a running mrepo's runtime extracted it, has no
problems. Run through `runtime run`, which sets `MREPO`, the mrepo's
directory, `PACKAGE`, and `SITU`, a file with the mrepo's state, its help
as extracted among it; skipped without them.

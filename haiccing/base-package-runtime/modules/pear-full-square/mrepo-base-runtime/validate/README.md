# validate/

Tests every package carrying the runtime runs on itself, not the module's own tests.

The package's dispatcher adds them as units of its own: `/test/help` and
`/test/help-in-situ`.

## `help.test.js`

The package's help, extracted from its own files as a runtime would, has
no problems against the README rules. Run in a floating instance.

## `help-in-situ.test.js`

The package's help, as a running mrepo's runtime extracted it, has no
problems. Run through `runtime run`, which sets `MREPO`, the mrepo's
directory, and `PACKAGE`; skipped without them.

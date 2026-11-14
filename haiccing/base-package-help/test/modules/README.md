# test/modules/

The generic modules test, a test group: every module the package carries, tested by its own tests.

A package carries its modules whole, their tests with them. Each module's
tests run from its folder in the package, against the package's copies:
the code the package really runs. One module can be run alone, as
`/test/modules/<org>/<module>`.

A generic test: the same folder in every package.

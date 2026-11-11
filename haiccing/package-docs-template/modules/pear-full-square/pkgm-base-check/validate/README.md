# validate/

The test every package carrying pkgm-base-check runs on itself, as `/test/code`.

## `code.test.js`

The package's code against the rules: each module of ours it carries, and
its own entry points. Run in a floating instance, in `validate`.

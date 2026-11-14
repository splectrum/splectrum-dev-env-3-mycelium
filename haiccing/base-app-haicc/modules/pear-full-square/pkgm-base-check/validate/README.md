# validate/

The tests every package carrying pkgm-base-check runs on itself.

## `code.test.js`

The package's code against the code rules: each module of ours it carries,
and its own entry points. Run in a floating instance, as `/test/code`.

## `mrepo.test.js`

The package's mrepo side: its structure, its protocols, what it carries.
Run in a floating instance, as `/test/mrepo`.

## `package.test.js`

The package against the structure it is to have: its files, its sets, a
folder for every test, and a test of its own for what it provides. Run in
a floating instance, as `/test/package`.

## `mrepo-in-situ.test.js`

The package as a running mrepo holds it: linked, its bundle the one the
manifest names, its layers there. Run through `runtime run`, as
`/test/mrepo-in-situ`, which sets `MREPO`, `PACKAGE` and `SITU`, a file
with the mrepo's state; skipped without them.

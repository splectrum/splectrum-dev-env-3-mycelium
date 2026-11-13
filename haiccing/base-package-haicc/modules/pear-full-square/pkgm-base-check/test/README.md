# test/

The tests of pkgm-base-check, a section per file, each test by its name.

## `rules.test.js`

- a module that keeps the rules: none
- a module that breaks each: structure, imports, references

## `mrepo.test.js`

- a package well formed: its structure, its protocols, what it carries: none
- a package that breaks each
- a list that does not end with its own package
- hooks: in their place, on a transition, each a command

## `package.test.js`

- a protocol package with a test for each protocol: none
- it tests what it provides: a protocol without its test; a program, hooks, a list without any
- a documentation package: no test of its own asked, a folder documenting one left alone
- a package that breaks each: its files, its sets, a test that is not a unit
- a test of its own under a generic test's name: it would be taken for the generic one
- full holds modules where modules are carried

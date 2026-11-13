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

- a package well formed: a folder for every test, a test of its own, whatever its name: none
- it tests what it provides: protocols, a program, hooks, a list, and no test of its own
- every test has its folder: a generic test named in a set without one
- a documentation package: no test of its own asked, a folder documenting one left alone
- a package that breaks each: its files, its sets, a test that is not a unit
- the template itself has no pin
- full holds modules where modules are carried

# test/

The tests of pkgm-base-check, a section per file, each test by its name.

## `rules.test.js`

- a module that keeps the rules: none
- a module that breaks each: structure, imports, references

## `mrepo.test.js`

- a package well formed: its structure, its protocols, what it carries: none
- a package that breaks each
- an action is a documented method: its folder, the function it exports, what its README states
- a list that does not end with its own package
- hooks: in their place, on a transition, each a command

## `package.test.js`

- a package well formed: a folder for every test, a test of its own, whatever its name: none
- it tests what it provides: protocols, a program, hooks, a list, and no test of its own
- every test has its folder: a generic test named in a set without one
- every package has a test of its own: where nothing is specific, a dummy that says so
- the template itself: no test of its own asked, its folder documenting one left alone, no pin
- a package that breaks each: its files, its sets, a test that is not a unit
- full holds modules where modules are carried

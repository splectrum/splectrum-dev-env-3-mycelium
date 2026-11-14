# test/help/

The generic help test: the package's READMEs checked against the README rules.

The help is extracted from the package's own files, as a runtime would
extract it, and every README is checked: its one-liner, its summary, its
links, and that the READMEs cascade from the top.

Its code is in the module the package carries, at
`modules/pear-full-square/mrepo-base-help/validate/help.test.js`; `run.js` here runs
it. A generic test: the same folder in every package.

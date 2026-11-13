# test/mrepo-in-situ/

The generic mrepo test where the package is deployed: the package as a running mrepo holds it.

Run in a running mrepo with `runtime run`: the package is in the mrepo's
manifest, its bundle is the one named there, its layers exist; skipped
without the mrepo.

Its code is in the module the package carries, at
`modules/pear-full-square/pkgm-base-check/validate/mrepo-in-situ.test.js`; `run.js` here runs
it. A generic test: the same folder in every package.

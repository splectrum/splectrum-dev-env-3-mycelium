# haicc-deployment

A node's HAICC (phase 2's platform): `haicc.js`, run in a node's folder from
the platform's package. `haicc boot` is the node's warm boot (what was
copied in validated by the node itself, each package intact, then its
validation set; its container started from its config, `node.json`),
`haicc shutdown` its shutdown, `haicc test <package>` a package's tests,
`haicc fetch`, `list`, `version`. Its project layer was removed in phase 3
(step 1). To converge with the host's HAICC as nodes are rebuilt on the
mrepo framework (a node's repository of type `haicc`, its commands requests
to its inbox: `docs/design/repositories.md` of the development repository).

- `lib/container.js`: the node's container; `lib/log.js`: its log;
  `lib/pkgm.js`: the package manager beside it; `lib/selftest.js`.
- `npm test`: its tests, on Bare.

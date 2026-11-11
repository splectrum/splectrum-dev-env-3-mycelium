# modules/

The package's code: our modules and the third-party code they use.

Assembled from the modules `package.json` names, all the way down; never
edited by hand. Each of ours carries its own tests, run by the package's
modules test, `/test/modules`.

| ours | |
|---|---|
| [pear-full-square/mrepo-base-help/](pear-full-square/mrepo-base-help/) | Module: mrepo help, the READMEs of an mrepo's packages extracted, checked against the rules and retrieved by URI. |

The third-party code: `node_modules/`, 81 modules for linux-x64, each
with its version, licence and source in [third-party.json](third-party.json).
Our modules find each other by name through `node_modules/` (links).

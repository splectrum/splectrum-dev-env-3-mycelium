# modules/

The package's code: our modules and the third-party code they use.

Assembled from the modules `package.json` names, all the way down; never
edited by hand. Each of ours carries its own tests, run by the package's
modules test, `/test/modules`.

| ours | |
|---|---|
| [pear-full-square/mrepo-base-help/](pear-full-square/mrepo-base-help/) | Module: mrepo help, the READMEs of an mrepo's packages extracted, checked against the rules and retrieved by URI. |
| [pear-full-square/mrepo-base-request/](pear-full-square/mrepo-base-request/) | Module: the mrepo request protocol, a request from the inbox through pending, execute and done. |
| [pear-full-square/mrepo-base-service/](pear-full-square/mrepo-base-service/) | Module: the mrepo service protocol, the service state and its actions. |
| [pear-full-square/mycelium-container-document/](pear-full-square/mycelium-container-document/) | A storage container: one value per file, written atomically, in the encoding it is given |
| [pear-full-square/mycelium-git/](pear-full-square/mycelium-git/) | The repository rules over a backend contract |
| [pear-full-square/mycelium-uri/](pear-full-square/mycelium-uri/) | Our URIs: parse, validate, split at known prefixes |
| [pear-full-square/mycelium-value-json/](pear-full-square/mycelium-value-json/) | An encoding, as a handler: one value to bytes and back, as JSON |
| [pear-full-square/mycelium-xpath/](pear-full-square/mycelium-xpath/) | Navigate a tree by path, generic |
| [pear-full-square/pkgm-base-check/](pear-full-square/pkgm-base-check/) | Module: the checks a package runs on itself, its code against the code rules and the integrity of its mrepo side. |

The third-party code: `node_modules/`, 181 modules for linux-x64, each
with its version, licence and source in [third-party.json](third-party.json).
Our modules find each other by name through `node_modules/` (links).

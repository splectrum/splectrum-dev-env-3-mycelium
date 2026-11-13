# modules/

The package's code: our modules and the third-party code they use.

Assembled from the modules `package.json` names, all the way down; never
edited by hand. Each of ours carries its own tests, run by the package's
modules test, `/test/modules`.

| ours | |
|---|---|
| [pear-full-square/mrepo-base-haicc/](pear-full-square/mrepo-base-haicc/) | Module: the mrepo haicc protocol, goto and the commands that follow it. |
| [pear-full-square/mrepo-base-help/](pear-full-square/mrepo-base-help/) | Module: mrepo help, the READMEs of an mrepo's packages extracted, checked against the rules and retrieved by URI. |
| [pear-full-square/mrepo-base-xpath/](pear-full-square/mrepo-base-xpath/) | Module: a local URI resolved to a node position in an mrepo, an ordinary node or a shortcut. |
| [pear-full-square/mycelium-uri/](pear-full-square/mycelium-uri/) | Our URIs: parse, validate, split at known prefixes |
| [pear-full-square/pkgm-base-check/](pear-full-square/pkgm-base-check/) | Module: the checks a package runs on itself, its code against the code rules, the integrity of its mrepo side and its own structure. |

The third-party code: `node_modules/`, 63 modules for linux-x64, each
with its version, licence and source in [third-party.json](third-party.json).
Our modules find each other by name through `node_modules/` (links).

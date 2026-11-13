# modules/

The package's code: our modules and the third-party code they use.

Assembled from the modules `package.json` names, all the way down; never
edited by hand. Each of ours carries its own tests, run by the package's
modules test, `/test/modules`.

| ours | |
|---|---|
| [pear-full-square/mrepo-base-boot/](pear-full-square/mrepo-base-boot/) | Module: the mrepo boot protocol (deploy, teardown, redeploy) and the install routine. |
| [pear-full-square/mrepo-base-execute/](pear-full-square/mrepo-base-execute/) | Module: the mrepo execute protocol, an action run in execution branches, committed or rolled back. |
| [pear-full-square/mrepo-base-help/](pear-full-square/mrepo-base-help/) | Module: mrepo help, the READMEs of an mrepo's packages extracted, checked against the rules and retrieved by URI. |
| [pear-full-square/mrepo-base-protocol/](pear-full-square/mrepo-base-protocol/) | Module: the mrepo protocol protocol, activate and deactivate. |
| [pear-full-square/mrepo-base-request/](pear-full-square/mrepo-base-request/) | Module: the mrepo request protocol, a request from the inbox through pending, execute and done. |
| [pear-full-square/mrepo-base-runtime/](pear-full-square/mrepo-base-runtime/) | Module: the mrepo runtime, the engine running an mrepo's protocols. |
| [pear-full-square/mrepo-base-service/](pear-full-square/mrepo-base-service/) | Module: the mrepo service protocol, the service state and its actions. |
| [pear-full-square/mrepo-base-xpath/](pear-full-square/mrepo-base-xpath/) | Module: a local URI resolved to a node position in an mrepo, an ordinary node or a shortcut. |
| [pear-full-square/mycelium-container-document/](pear-full-square/mycelium-container-document/) | A storage container: one value per file, written atomically, in the encoding it is given |
| [pear-full-square/mycelium-git/](pear-full-square/mycelium-git/) | The repository rules over a backend contract |
| [pear-full-square/mycelium-uri/](pear-full-square/mycelium-uri/) | Our URIs: parse, validate, split at known prefixes |
| [pear-full-square/mycelium-value-json/](pear-full-square/mycelium-value-json/) | An encoding, as a handler: one value to bytes and back, as JSON |
| [pear-full-square/mycelium-xpath/](pear-full-square/mycelium-xpath/) | Navigate a tree by path, generic |
| [pear-full-square/p2p-mrepo/](pear-full-square/p2p-mrepo/) | Mycelium repositories on the p2p layer: created, imported, cloned and opened on a p2p-store, each a mycelium backend |
| [pear-full-square/p2p-replicate/](pear-full-square/p2p-replicate/) | Replication for the p2p layer: a store over any stream, accounting per peer and resource, holding a resource whole |
| [pear-full-square/p2p-store/](pear-full-square/p2p-store/) | Local storage for the p2p layer: a Corestore and its resources, no peer needed |
| [pear-full-square/pkgm-base-check/](pear-full-square/pkgm-base-check/) | Module: the checks a package runs on itself, its code against the code rules and the integrity of its mrepo side. |

The third-party code: `node_modules/`, 181 modules for linux-x64, each
with its version, licence and source in [third-party.json](third-party.json).
Our modules find each other by name through `node_modules/` (links).

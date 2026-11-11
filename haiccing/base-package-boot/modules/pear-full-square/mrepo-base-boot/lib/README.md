# lib/

The parts of mrepo-base-boot, a file each, imported by its `index.js`.

| file | |
|---|---|
| `build.js` | An mrepo built from its structure: a folder laid out by layers, a layer.json at each leaf, written as a standalone repository on disk, p2p-git's hybrid with every layer on the filesystem (the setting's `filesystem` storage). |
| `deploy.js` | The boot protocol's actions. |
| `packages.js` | Packages put in place, a boot activity: each package an mrepo lists, sourced into the work folder's store once, checked, hard linked individually into the mrepo's packages/ (it runs only what is registered for it), the list committed into its packages layer. |
| `prerequisites.js` | An mrepo's prerequisites: declared with their conditions in its package's config, checked when it is deployed, before anything is written; a fix only with a yes. |

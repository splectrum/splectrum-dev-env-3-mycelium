# internal/

The methods the actions and the boot call directly, never requested.

| | |
|---|---|
| [build/](build/) | an mrepo built from its structure |
| [place/](place/) | an mrepo's packages put in place, the packages layer committed |
| [fetch/](fetch/) | a package into the work folder's store, checked |
| [lay/](lay/) | a target package's list laid into a folder, the structure an mrepo is built from |

`child.js`, a helper the actions share, names the child an action is about.

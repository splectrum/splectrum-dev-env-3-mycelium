# internal/

The methods the actions and the boot call directly, never requested.

| | |
|---|---|
| [build/](build/) | an mrepo built from its structure |
| [place/](place/) | an mrepo's packages put in place, the packages layer committed |
| [fetch/](fetch/) | a package into the work folder's store, checked |
| [check/](check/) | an mrepo's prerequisites checked |

`child.js`, a helper the actions share, names the child an action is about.

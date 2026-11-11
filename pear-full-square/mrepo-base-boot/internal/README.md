# internal/

The methods the actions and the boot call directly, never requested.

| | |
|---|---|
| [build/](build/) | an mrepo built from its structure |
| [place/](place/) | an mrepo's packages put in place, the packages layer committed |
| [fetch/](fetch/) | a package into the work folder's store, checked |
| [structure-of/](structure-of/) | a package's `mrepo/` part, read from its bundle |
| [store-of/](store-of/) | the work folder's package store |
| [put/](put/) | a file into place, hard linked or copied |
| [child/](child/) | the child mrepo a boot action names |
| [check/](check/) | an mrepo's prerequisites checked |
| [parse-source/](parse-source/) | a source parsed |
| [in-container/](in-container/) | whether this process runs in a container |
| [bare-of/](bare-of/) | the Bare a work folder's mrepos run on |
| [acceptable/](acceptable/) | an installed Bare's version accepted or not |

# test/

The haicc command tested end to end as it is installed, from the installer to a started host and its teardown.

`sh test/run.sh` works in a temporary folder, removed after, and leaves
nothing running. It needs a sources folder with the packages' bundles and
Bare's tarball: `SOURCES`, else the development repository's `sources/`;
without one it is skipped. `--keep` leaves the folder and its runtimes to
inspect. One line a check, the count last; exit 0 passed, 1 failed.

## Steps

1. **The installer**: the one `build.sh` writes; installed with `--home`
   and `--bin`; the command registered.
2. **The dispatcher**: its usage; no such script command; a URI with no
   command after it; `haicc boot` alone; `--output` without a URI.
3. **Nothing there yet**: the prerequisites say what is missing;
   `haicc boot/deploy` stops and writes nothing; `haicc boot/teardown` and
   an mrepo command say there is no boot mrepo.
4. **The sources**: a folder linked, listed before https; the backup off
   and on; a folder linked twice listed once; a folder that is not there;
   a download of our packages, not published yet.
5. **The prerequisites**: a check changes nothing; `haicc prereq` unpacks
   the pinned Bare from the sources and records its hash; there next time.
6. **The boot**: `haicc boot/deploy`: the boot mrepo at the root, its
   runtime started, nothing deployed.
7. **Commands**: the host deployed at the root from
   `base-component-haicc`, the response record printed whole; deployed
   again, an error on stderr; its boot protocol behind the service's door;
   `service/initialise` and `service/start` passed through to it, each
   answering what was done and the state now (`--output`).
8. **What is missing is said**: a target, a package, a command; a
   protocol or an action that is not there, with those that are.
9. **A node inside the host**, deployed by a command passed through;
   commands chained through both shortcuts; a URI running through a
   shortcut; an argument with spaces and quotes; the output alone.
10. **Torn down**: the node; the service stopped and shut down; the host.
11. **The boot again**: there already, kept.
12. **The machine level torn down**: `haicc boot/teardown` with a host
    deployed: both runtimes stopped, the mrepos and the package store
    removed, Bare, the sources list and the scripts kept; a second time,
    nothing there; `haicc boot/deploy` brings it back.

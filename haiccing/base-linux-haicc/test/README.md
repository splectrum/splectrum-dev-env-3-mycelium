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
   command after it.
3. **Nothing there yet**: the prerequisites say what is missing; `haicc
   boot` stops and writes nothing; an mrepo command says there is no boot
   mrepo.
4. **The sources**: a folder linked, listed before https; the backup off
   and on; a folder linked twice listed once; a folder that is not there;
   a download of our packages, not published yet.
5. **The prerequisites**: a check changes nothing; `haicc prereq` unpacks
   the pinned Bare from the sources and records its hash; there next time.
6. **The boot**: the boot mrepo at the root, its runtime started, nothing
   deployed.
7. **Commands**: the host deployed at the root from
   `base-component-haicc`; deployed again, an error; its boot protocol
   behind the service's door; `service/initialise` and `service/start`
   passed through to it.
8. **A node inside the host**, deployed by a command passed through;
   commands chained through both shortcuts; a URI running through a
   shortcut; an argument with spaces and quotes; the whole record.
9. **Torn down**: the node, then the host.
10. **The boot again**: there already, kept.

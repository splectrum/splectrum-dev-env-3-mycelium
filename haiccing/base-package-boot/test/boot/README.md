# boot/

The boot, tested end to end as the package runs it.

It runs `bare run.js --work=<folder>` in a temporary work folder, removed
after, with everything from the package's own `modules/`. Entry: `run.js`;
the tests: `boot.test.js`. It leaves nothing running.

## Steps

1. **The sources missing**: a source folder that is not there; the boot
   says so, exit 1, its request (`boot deploy /boot`, the command as
   typed) completed with the error; no runtime started.
2. **The whole lifecycle** (needs `SOURCES`):
   - the boot: the boot mrepo built, its packages placed and linked, its
     request handed over, its runtime started on the Bare that ran it (none
     put in place); nothing deployed by it;
   - its runtime's own requests as it started, internal: its protocols
     registered, its help extracted;
   - the host deployed by a command at the root, `boot/deploy host
     <package>`: built inside the boot mrepo (`main/host/`), its runtime
     running, its shortcut at `/xpath/host/shortcut.json`, nothing of it in
     `main`, its unique URI `local/host`; the records followed, the request
     history in `request/done`;
   - requests posted to the boot mrepo's inbox: `boot redeploy /host` (the
     old runtime stopped, a new one), `boot teardown /host` (its runtime
     ended, its folder and shortcut gone), `boot deploy /host` again;
   - `haicc`, commands as typed: `haicc /host help/get /packages` sent to
     the boot mrepo goes to the shortcut, the command that follows is sent
     on to the host unchanged, the request waits and is completed with the
     host's response; `haicc / ...` is executed here; a URI running through
     a shortcut and a position inside `main` are refused; a chained `haicc`
     is the linked mrepo's to execute; a plain command at the root;
   - the runtime protocol: `runtime run` on the runtime package, a dry run
     of `test/full` (what it would run), a run of `test/validate` (passed,
     in a floating instance, a line a unit in its log), `/run` refused;
   - an mrepo with a service, deployed from `base-package-service`: its
     state booted and its API closed, its protocols recorded, the service's
     actions each in its state, its API open once started, a protocol it
     does not link not offered, the package validated in situ, torn down;
   - the haicc component, deployed from `base-component-haicc` (named
     without its organisation): its packages layer the component's list,
     its `main` empty; booted, its boot protocol behind the service's door;
     `haicc /haicc service/initialise` and `service/start` passed through
     to it; a node deployed inside it by `haicc /haicc boot/deploy node-1`,
     its shortcut in the haicc mrepo's `xpath` layer only; commands chained
     through both shortcuts; the component validated in situ; the node,
     then the component, torn down;
   - both runtimes stopped; the boot run again: already built, nothing
     committed, its runtime started again, nothing repeated.

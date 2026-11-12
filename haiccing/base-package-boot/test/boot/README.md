# boot/

The boot, tested end to end as the package runs it.

It runs `bare run.js --work=<folder>` in a temporary work folder, removed
after, with everything from the package's own `modules/`. Entry: `run.js`;
the tests: `boot.test.js`. It leaves nothing running.

## Steps

1. **A prerequisite missing**: a source folder that is not there, then
   Bare missing without `--yes`; each time the boot stops before writing
   anything, exit 3, its request (`boot deploy /boot`, the command as
   typed) completed with what is missing.
2. **The whole lifecycle** (needs `SOURCES`):
   - the boot: prerequisites, the pinned Bare put in place (no Bare on the
     PATH, `--yes`), the boot mrepo built, its packages placed and linked,
     its request handed over, its runtime started;
   - the preloaded `boot deploy /host`: the host built inside it
     (`main/host/`), its runtime running, its record at `main/host.json`;
     the records followed, the request history in `request/done`, the
     outbox; its runtime's own requests as it started, internal: its
     protocols registered, its help extracted;
   - requests posted to the boot mrepo's inbox: `boot redeploy /host` (the
     old runtime stopped, a new one), `boot teardown /host` (its runtime
     ended, its folder and record gone), `boot deploy /host` again;
   - the runtime protocol: `runtime run` on the runtime package, a dry run
     of `test/full` (what it would run), a run of `test/validate` (passed,
     in a floating instance, a line a unit in its log), `/run` refused;
   - an mrepo with a service, deployed from `base-package-service`: its
     state booted and its API closed, its protocols recorded, the service's
     actions each in its state, its API open once started, a protocol it
     does not link not offered, the package validated in situ, torn down;
   - both runtimes stopped; the boot run again: already built, nothing
     committed, its runtime started again, the host not redeployed.
3. **An installed Bare** on the PATH: used and recorded, none put in
   place, no question asked, its runtime started on it; run again without
   it on the PATH: the recorded one used.


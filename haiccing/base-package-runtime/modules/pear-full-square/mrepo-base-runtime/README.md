# mrepo-base-runtime

The mrepo runtime: the always-on process that runs an mrepo's protocols.

It holds the mrepo's store as its single writer, serves its local connection
(`status`, `stop`), and fires the protocols in turn over their data states.
Before the mrepo is operational, it places its own requests, such as
its help's extraction, and takes none from the inbox. Its own package offers the `runtime`
and `help` protocols.
Other protocols come from the linked packages. It is started from the
mrepo's own packages: `bare
<dir>/packages/haiccing/base-package-runtime.bundle <dir>`.

| | |
|---|---|
| [lib/](lib/) | its parts, a file each |
| [test/](test/) | its tests, what each checks |

## Design

- `index.js`: the library. No protocol is built in: every action comes
  from a package. `test/runtime.js`: a command line for the tests, started
  with `rest` and `service` as packages would offer them.
- The protocols its linked packages offer (`protocolsOf`): each package
  in its `packages` layer with a `protocol` entry, imported from its
  `packages/` (the bundle's dispatcher, `run('/protocol')`: nothing else
  runs on import): its actions, and its configs, which the check reads
  (`ctx.protocols`).
- Before it is operational, its own requests, internal: `runtime register
  /` (the protocols it loaded, recorded in its `protocols` layer), then
  `help extract /`, each where the mrepo has the layer; until they are
  done, it takes nothing from the inbox. Then `help get <uri>` reads
  the help.
- Its own package's protocols, passed in by its `run.js` (`run({ own })`;
  its bundle not imported again): `runtime run` and `runtime register`,
  from `lib/protocol.js`, and `help`, from `mrepo-base-help`. `runtime run
  /packages/<org>/<package><target>`, body `{ dryRun }`: a linked package's
  entry through its dispatcher, its tests above all (a floating instance of
  the package, each unit its own process); the result the request's output,
  a line a unit in its log. `/protocol`, `/deploy`: the names offered.
  `/run` refused (a package's program, not run inside the runtime). Without `service` (no `runtime/service.json`): no
  gate, and the runtime keeps running until stopped.
- An mrepo by its directory (`run({ repo })`, as `ask`, `start`, `open`):
  `<work>/mrepos/<name>`, on the filesystem storage, its socket
  `<repo>/runtime.sock`, else (too long for a Unix socket: nested children)
  a short path in the temporary folder named by the directory's hash
  (several mrepos in one work folder); its own folder its working place
  (`dir`: its inbox folder, its packages); started from
  its own `packages/` (`start({ repo })`: `bare <repo>/packages/haiccing/
  base-package-runtime.bundle <repo>`).
- Its repository opened by the setting beside it (`<work>/mrepo.json`):
  `git`, a standalone repository on native git (`<work>/mrepos/<name>/.git`,
  bare); `filesystem`, p2p-git's hybrid with every layer on the filesystem (the same
  folder, no Corestore: the boot mrepo); `p2p` (the default), the host's
  repository over its Corestore and disk side. The same protocols on all.
- One poller fires the protocols in turn over their data states: on the
  p2p host (and on `filesystem`) the inbox folder's new files committed, the request protocol (`mrepo-base-request`), the
  execute protocol (`mrepo-base-execute`). It runs until it is stopped: a parent's teardown
  stops its child's.
- `test/fixture.js`: a booted host, for the tests.

## Tests

- `npm test`: the unit tests

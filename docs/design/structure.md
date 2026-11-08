# The levels' structure, code without a code folder, Pear below HAICC

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle), **to probe** (to try before designing
further). Decided with the human, 2026-11-08 (phase 3, step 1's review); the
folder structure to be fixed in this phase, step by step.

## Every level set up as a node is

**Agreed.** The host, a swarm's master, a node: the same structure. Its code
from the packages repository (a view, or a module protocol: below); its
config, state and log in its own repositories, in a store of its own
(`repositories.md`); its own HAICC. Then it does not matter where HAICC
runs (a container, the host, another machine): one structure, one set of
commands, one test path; execution becomes portable (`repositories.md`).

- **HAICC is mainly a wrapper**: of the package manager, `docker-manager`,
  mycelium's operations, with what a wrapper needs (config, the levels).
  The root's and swarms' HAICC (`haicc-base-boot`) and the node's
  (`haicc-deployment`) converge into one; its split into more modules
  (`haicc-base-host`, `-root`, `-swarm`, `-node`) comes lazily, when the
  number of operators grows (the rename of `haicc-deployment` held until
  then). Host B simply runs a node setup.
- **What differs is what is provided, an organisational matter**: Docker, a
  person at a terminal, the network, the runtime. HAICC asks what is
  provided, not where it is (`host.json`, agreed in `packages.md`,
  generalised). A capability may be provided from elsewhere: a node
  managing Docker through a proxy on the host (`docker-manager` exposed to
  authorised peers, narrowly: its swarm's containers, hardened), as
  `vision.md`'s configurable authority.

*Why*: the same structure everywhere makes execution portable and the
platform one thing to build and test.

## A level's folder

**Open** (to probe and settle):

```
<level>/
  store/            the level's own store: its repositories, the packages repository among them
  addons/           native addons, extracted by hash
  apps/<package>/   a package's own data: its store, its repositories (made at deploy, removed at teardown)
  log/              the minimal plain-file log
  haicc             its launcher
```

No code folder (below); a view of code only where Docker or a person needs
it. A minimal plain-file log stays (**open**: its scope), for the cold boot
(before any store exists) and the store's own failures. How config is
changed, once it is in a repository (a `haicc` command, or a view edited and
committed): **open**.

## Code without a code folder

**To probe.** Bare's module loader (`bare-module`) resolves and loads every
module through a protocol (`resolve`, `exists`, `read`, `addon`, `asset`);
custom protocols exist for loading from a Hyperdrive. Two constraints: `read`
is synchronous, so the code must be local before it runs (replicated,
prefetched, or one bundle file); native addons (`.bare`, by `dlopen`: RocksDB,
sodium, UDX) must be real files. `bare-bundle` holds many modules in one file
Bare runs directly.

So a package runs through a mycelium protocol (its tree at the commit its
`packages/<purpose>` link names; its closure fetched first, as the package
manager's `closure.js` computes it), or from a `bare-bundle` built from that
tree; native addons extracted by hash. Unlike Pear's drive of files, ours
holds git objects: every version addressable by its commit and checked
against its hash.

Today (**built**): the platform's nodes run from the master's `packages/`,
assembled on the host, mounted read-only (a transitional shortcut for one
host); host B's node gets its code by replication and extraction
(`p2p-node/boot.js`), the direction `vision.md` names.

**The probe**: (1) a custom protocol loading a small package from a commit's
tree in a p2p-git repository, on Bare; (2) the same package as a
`bare-bundle` built from that tree; (3) native addons (Pear's way; extracted
by hash).

## Pear as a substrate execution layer below HAICC

**Agreed** (the release itself out of phase 3's scope: the request has Pear
not in this phase; `vision.md`: Pear when versions are fixed).

- **Pear distributes our releases**: a Pear app is our release, extracted,
  potentially the full package set preloaded, in place of `haicc-setup.sh`.
- **Pear only ever triggers our cold boot**: from its folder on the host,
  the release boots into a **HAICC bridgehead** (a level set up as a node
  is), where Pear's world hands over to ours; it installs the HAICC platform
  on the part of a swarm that has the Pear distribution, or makes a separate
  swarm. From there, our design: the container node model (hardened
  containers, Docker through `docker-manager`, a node's Docker by the host's
  proxy) and the additional swarm security (our own DHT per swarm,
  authorised keys, invitations, the warm boot's validation).
- **Kept clean by**: two upgrade mechanisms, each its own scope (Pear
  updates the release, the bootstrap; HAICC updates everything after it, by
  its repositories and links; a newer release matters at the next cold boot,
  never to a running platform, as "the setup's pair is a bootstrap" today);
  the preloaded packages a starting point only (after the boot, packages
  come through our sources and repositories); the network boundary visible
  (Pear distributes over its DHT; our swarms keep their own: `vision.md`, a
  public component and air-gapping).

*Why*: Pear's distribution, seeding and release updates, without its
constraints spilling into HAICC's design.

### Pear's model, our reference

As we know Pear's design (**to verify** with the probe):

- **An app** is identified by its key (a stage or release channel its own
  key); its code in Pear's shared platform store (deduplicated); its data in
  a storage folder of its own, apart from other apps' and from the code;
  separation by convention and the user's trust, not a sandbox. In our
  terms, the app is the package (its data in `apps/<package>/`).
- **Upgrades**: versions are lengths of the app's append-only drive (`pear
  stage` appends; `pear release` marks the released length; a link may pin
  key and length, which is also how to go back); the drive replicates in the
  background; the running app is told of a new release and decides (restart
  now, or at its next start; nothing swapped under running code); someone
  seeds it (`pear seed`); Pear's platform updates itself the same way.

Ours (**agreed**): a version is a commit of the package's repository; the
link in `packages/default`, promoted from `packages/test`, is the release
mark; pinned or following, per layer (`repositories.md`, open); replication
signalled by RPC is the notification; the level's HAICC decides, after
validating the new version (intact, its validation set: the warm boot's
check, which Pear lacks), restarting onto it or waiting; a rollback points
the link back to the previous commit; the platform's pair is refreshed by
the same mechanism.

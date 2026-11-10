# HAICC's documentation

HAICC sets up and runs swarms of nodes on a host: a work folder, booted from
one setup file, holding the host's swarms and their nodes, each level run by
its own HAICC, everything on Bare.

Three kinds of document, each with its own job:

- **Design** (`design/`): the decisions. What was decided, and why, once,
  by topic. Each decision carries its status:
  - **built**: in the code, tested (where: named);
  - **agreed**: decided with the human, not built yet;
  - **open**: to settle with the human;
  - **to probe**: to try before designing further.
  When practice shows a decision wrong, it is changed here (and the change
  said in the commit), not added beside it.
- **Rules** (`rules.md`): the consistency rules. What every package,
  command, script and test follows, so the whole stays one thing. Short,
  checkable.
- **Guides** (`guides/`): how to do things. For a user (install, swarms),
  a developer (tests, packages), the local agent (releases).

| | |
|---|---|
| [design/platform.md](design/platform.md) | (phase 2's) the levels (host, swarm, node), cold and warm boot, a node's validation, the log |
| [design/packages.md](design/packages.md) | a package's structure; self-contained; sealed, validated, mixed; the two sides of the airgap |
| [design/work-folder.md](design/work-folder.md) | (phase 2's) the work folder; boot and shutdown by level; swarms and nodes; teardown |
| [design/functionality.md](design/functionality.md) | (phase 2's) a package's functionality by URI: cold boot, teardown; tests and sets |
| [design/sources.md](design/sources.md) | where packages come from; contents; air-gapping |
| [design/bare.md](design/bare.md) | Bare only; the runtime in the setup; hard links; brittle |
| [design/releases.md](design/releases.md) | (phase 2's) the setup; publishing; who tests what |
| [design/pipeline.md](design/pipeline.md) | the development pipeline: modules as the source of truth, cloud and local, candidates |
| [design/repositories.md](design/repositories.md) | mycelium repositories: one repository over two stores (the Corestore, git on disk); the layers; one writer per branch; the mrepo framework (the runtime, the request and execute protocols); a type's API as a package; the external API (`rest`, `service`, requests as Kafka records); roots and mappings; the boxes; backup |
| [design/structure.md](design/structure.md) | every level set up as a node is; one writer per store; a level's folders (`mrepos/<name>/`); the boot; the terminal; code without a code folder (bundles, addons); Pear below HAICC |
| [design/values.md](design/values.md) | values: the data type, encodings and containers; envelope and content; RPC on the replication connection |
| [design/modules.md](design/modules.md) | the modules: removed, new, moved; wrapped in HAICC; Splectral done properly |
| [rules.md](rules.md) | the consistency rules |
| [guides/install.md](guides/install.md) | (phase 2's) setting up and booting a work folder; testing a release |
| [guides/swarms.md](guides/swarms.md) | (phase 2's) swarms and nodes: the commands, level by level |
| [guides/tests.md](guides/tests.md) | (phase 2's) writing tests: a module's, a package's, a booted one |
| [guides/packages.md](guides/packages.md) | writing a package with the package writer |
| [guides/release.md](guides/release.md) | publishing a release and checking it |

Elsewhere: `rules.md` at this repository's root (how to work in this
repository: branches, layers, commits, URIs, data names), `vision.md` (the
directions), `notes/plan.md` (the roadmap), `notes/next.md` (the handover:
where things stand). `notes/packages.md` is the design's history, by date:
superseded by `design/`.

The words used:

- **work folder**, or **install**: one folder, set up from one setup file
  (`haicc-setup.sh`), holding everything of HAICC on a host. Several can
  sit side by side.
- **level**: the host (the work folder), a swarm (its folder), a node (its
  folder). Each has its `haicc`, and works on its own folder's config.
- **platform**: what the levels are and do: HAICC and the package manager,
  carried by `base-package-haicc`.
- **package**: a self-contained folder, published as a haiccing
  repository (`base-package-haicc`, ...).
- **the package writer**: writes packages (the development side).
  **The package manager**: installs, assembles and tests them (the host side).
- **the service protocol** (`docs/design/repositories.md`): `boot` (makes
  and copies in; was the cold boot) and `teardown`; `initialise` (what then
  sets up and checks; was the warm boot) and `shutdown`; `start` and `stop`;
  `pause` and `resume`; `run` the whole cycle.

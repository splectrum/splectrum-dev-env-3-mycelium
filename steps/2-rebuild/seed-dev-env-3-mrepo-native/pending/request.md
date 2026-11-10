# Request: the mrepo framework on native git, standalone

From: `splectrum/roadmap-1`, 2026-11-10, settled in discussion with the
human in `dev-env-3-mycelium` (phase 3, step 2). Part of the roadmap's
phase 3.

## Why

The development pipeline an AI runs autonomously on the p2p layer is the
mrepo framework (`docs/design/repositories.md`, "A running repository"):
requests into a repository's inbox, executed, recorded. Built and proven
first on native git, standalone, in a cloud session: the same framework,
only how the repository is opened differs (`docs/design/native.md`).

## First: plant this seed

This seed was prepared in `splectrum/roadmap-1` under
`seeds/dev-env-3-mrepo-native/`. Plant it by hand; this is the bootstrap.

1. Put `README.md`, `CLAUDE.md`, `rules.md`, `docs/` and this request
   (`request.md`) on `main`.
2. Push `main`. The other layers come with the boot (below).

## The work

Step by step, each step's detail decided with the human as it starts;
each decision recorded once in `docs/design/`, built or agreed.

1. **The source on `main`**, from
   `splectrum/splectrum-dev-env-3-mycelium` (its `main`, as of `ced455d` or
   later): what the framework's packages need to be built, tested and
   released: the `mycelium-*` and `mrepo-base-*` modules, `haicc-base-cli`
   and what they use (the package writer's closure tells), each module's
   folder with its history (split, at its product repository's path,
   `pear-full-square/<module>`); `haiccing/base-package-haicc/api.json`;
   `tools/` (`install.sh`, `ensure-bare.sh`, `bare`, the package writer,
   `products.sh`); `packages.json`, `package.json` and its lockfile, trimmed
   to these. Bare only, no Node.js. **To settle first, with the human**:
   where these modules are developed from now on (here, or still in
   `dev-env-3-mycelium`), so each has one source.
2. **The storage setting and the opener**: the runtime opens its repository
   by `mrepo.json` beside it (`git` or `p2p`); the repository's folder a
   parameter (its boxes, `packages/`, log, local connection); HAICC's input
   finding a standalone repository; `service initialise` reading the API
   from the type's bundle as now.
3. **A boot for a git repository**: this repository booted as a mycelium
   repository of type `haicc`: a bare clone, its layers created
   (`packages`, `runtime`, `request/pending/default`, `request/execute`,
   `request/done`), the first bundles (built here by the package writer)
   committed into `packages` with a signed manifest, `/runtime/service.json`
   booted, `service initialise /` preloaded.
4. **Running it in a cloud session**: the steps written down (clone, boot
   once, start the runtime from its bundles, requests with `haicc`, push
   every layer at checkpoints, take over in a new session); proven: a
   session ends, a new one clones it back and goes on.
5. **The pipeline's first loop**: a request changing the source on `main`;
   new bundles built from it and committed into `packages`; `service
   initialise` onto them; the repository running its new code. Then: the
   build itself a request (with the human).

## Done

The framework running standalone on native git in a cloud session, this
repository its own first user: a change to its source made as a request,
rebuilt into its packages, and run, with every step recorded in
`request/done`; the same framework still passing its tests on p2p.

# dev-env-3-mrepo-native

A mycelium repository on native git, standalone: the mrepo framework (the
runtime, the request and execute protocols) running on an ordinary git
repository, every layer on the filesystem, requests submitted to its
inbox. Its own development pipeline: its `main` holds the source it
develops, its `packages` layer the bundles it runs, its requests change
the one and rebuild the other. The same framework as on the p2p layer
(phase 3's `dev-env-3-mycelium`), so what is developed here is what an AI
runs on p2p in autonomous mode.

- `rules.md`: how to work in this repository: its layers, requests, sync.
- `docs/design/`: the design it builds on (from `dev-env-3-mycelium`), and
  `native.md`, this repository's own.

Status: seed — prepared in `splectrum/roadmap-1`, 2026-11-10, from
`splectrum/splectrum-dev-env-3-mycelium@ced455d`.

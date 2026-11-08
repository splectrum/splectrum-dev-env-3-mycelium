# Environment probes (2026-10-30)

In a Claude Code cloud session: Linux 6.18, 4 cores, 16 GB, root.

## env/docker

- The Docker client and daemon (29.9.2) are installed; the daemon is not
  running at start. `dockerd > dockerd.log 2>&1 &` starts it in a couple of
  seconds: overlayfs, cgroup v1 (cgroupfs), bridge networking works,
  including user networks with fixed addresses (`--subnet`, `--ip`).
- Pulls from Docker Hub sometimes answer `429 Too Many Requests`; a retry
  goes through. Base images are kept few (debian:bookworm-slim).
- Limits: the session's disk allowance holds images and containers; a
  container gets the session's 4 cores and memory.

## env/udp

- Outbound UDP does not reach the public HyperDHT: a DHT node comes up
  with no peers (`nodes: 0`, no host). The public DHT is out of reach.
- UDP between processes on the host and between containers on a bridge
  network works. A cluster runs its own private DHT, bootstrapped by the
  seed node (`mycelium-node`'s `startBootstrap`).

## Bare in a plain container

- Bare's binary (bare 1.36.0, from npm's `bare-runtime-linux-x64`) needs
  only glibc and libstdc++, which debian:bookworm-slim has. Image
  `bare-base`: 238 MB, of which Bare is 97 MB.
- Corestore, Hyperdrive (rocksdb-native) and Hyperswarm (udx-native) run
  under Bare in it, from mounted folders, with linux-x64 prebuilds only.

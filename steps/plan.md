# Phase 3: plan

The phase's request: `pending/phase-3/request.md` on `pending/default`.
Planned here as the work goes (the request: "the work is planned here, as
it goes"); each step a request of its own, its record in `steps/<step>/`.

## Steps

| Step | What | Status |
|---|---|---|
| 0 | The setup: the seed planted, the development state from phase 2 (`0-setup/`) | done |
| 1 | The review of phase 2's code, and the refactor (`1-review/`) | the review discussed with the human, decisions in `1-review/findings.md`; the dead layer and the unused CLIs removed; the fixes and new modules next |
| 2 | The documentation: the stale notes cleaned up, the documentation split into clear sections | to come |
| 3 | Mycelium repositories on a swarm: data hives, mounting, a repository for the logs | to come, designed with the human step by step |

## To pick up when the work touches the area

Recommendations and decisions waiting for the area to be worked on; each
taken up then, with the human, and the code there reviewed further for
improvements as the work builds on it.

- **Splectral, done properly** (the human, 2026-11-08: it was plumbed in for
  the demos only; to be done properly in this phase). Recommended:
  - `p2p-node` knows no Splectral and no manager: it offers one general way
    to attach an application to a running node (the node and its input
    handed to it), naming none; what is attached comes from the node's
    configuration, started through the node's HAICC; the observer
    (`splectral-p2p-observer`) and the manager's shadow attach themselves.
    Today `p2p-node/cli.js` imports the observer under `--observer=true`
    (undeclared) and reads the shadow from stdin.
  - Splectral wrapped in HAICC: the server and its `act` through HAICC
    (findings, decided 5).
  - Splectral's p2p side asking the owners: Docker through
    `docker-manager`, the swarm's nodes through HAICC, the node manager's
    topic layout from `p2p-node-manager` (findings, decided 8).
  - The review's Splectral findings (`1-review/findings.md`, 3, 6, 8):
    p2p keys in the contract's abstract world and the model, the whole
    config (vaults) given to every action, action arguments not validated
    at the boundary, the browser side without tests.
  - Its real-time communication: the RPC server on AVRO, on the replication
    connection (`vision.md`, "Values on the wire and at rest").
- **HAICC in the container**: the node's program started through the
  node's HAICC (findings, decided 5).
- **The cold boots**: the initial one may use the module directly; every
  other wrapped in HAICC; the shell commands analysed and wrapped (findings,
  decided 5).
- **The log writer**: when the logs are a mycelium repository (findings,
  decided 1).
- **The request queue**: the request manager, several source types
  (findings, decided 9).
- **Host B**: whether it runs HAICC (findings, decided 2).

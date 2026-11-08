# Several swarm memberships

Status: **vision, 2026-10-31**: directions discussed, not for
implementation now. It builds on the node pattern (`node-pattern.md`): a
node can be a member of more than one swarm, each for its own purpose.

## Three memberships, three planes

| Membership | Purpose | Lifetime |
|---|---|---|
| boot | load the node's secrets into memory | at each start, then left |
| management (config) | configuration, updates, status, logs | while running |
| destination | the swarm's data and work | while running |

Each can be a swarm of its own, or one swarm with different
admissions. On a host, boot and management are the auxiliary swarm
local to the host (`node-pattern.md`); the destination is the proper
swarm.

## Boot membership

Secrets live in memory only, so every start loses them by design, and
every start gets them back through a membership with that single purpose.

- At each start the node joins the boot swarm with its boot identity,
  receives its secrets over an ephemeral channel into memory, and leaves.
- Least privilege: the boot identity can do one thing, obtain this node's
  secrets. It reads no data, configures nothing, reaches no other swarm.
- The boot identity is the only persistent credential, held where it
  cannot be extracted (a TPM or secure element on a device, the vault on a
  host).

What it gives:

- A node that is switched off holds no secrets; a stolen device yields only
  its boot identity, useless once revoked.
- Revocation is a kill switch: a refused boot identity leaves the node
  nothing to run with at its next start.
- Rotation for free: secrets can differ at every start.
- Optionally, proof of the device's state (attestation) before secrets are
  released.

The trade-off: no boot swarm, no start. On a host the boot side is local
(its vault and node manager), so it does not matter. For devices in the
field it is a choice: wait (strict), or fall back to secrets sealed in the
device's TPM, released only to the measured boot state.

## Closed-box devices

The strongest case: an IoT Linux device with no SSH, no open ports, no
shell. Everything is outbound P2P; all management goes through
repositories.

1. It ships with the plain base (Linux and Bare), the join closure, the
   config swarm's key and bootstrap addresses, and its own boot identity
   from manufacture, registered with the config swarm. A read-only root
   filesystem, nothing else.
2. On start it joins the config swarm: it authenticates the swarm by
   the key pinned in its image, the swarm authenticates it by its
   registered public key.
3. It receives its destination: secrets (boot membership, into memory),
   its node repository, and its packages by replication from the
   capability store, verified by commits and the store's key.
4. It goes live and joins its destination swarm.
5. It stays in the config swarm as its management plane: reconfiguration,
   updates (new package commits, pinned, with the previous commit to go
   back to), status and logs.

What differs from a node on a host:

- Trust must exist before first contact: an identity from manufacture (a
  keypair in a TPM or secure element), which is also the device's vault.
- Devices sit behind NAT: the config swarm needs reachable nodes (a VPS)
  and holepunching or relaying, which swarms on one network leave out.
- Updates must be safe to fail: pinned commits always allow going back;
  A/B partitions for the base itself, later.
- Offline: the device runs on what it holds and resynchronises when it can.

Related: `unit/iot` in `splectrum/roadmap-1:capabilities.md`; devices and
phones are outside this phase.

## Bridging swarms

A node that is a member of two swarms can bridge them. With one URI space
per swarm, a resource in another swarm is then requested by writing a
single URI: `/<other-swarm>/<node>/<repo>/<branch>/<path>`.

- **Delegation.** A swarm's `p2p-rns` sees that the first segment names
  another swarm and refers the lookup to the bridge registered for it (as
  DNS delegates a zone); the bridge resolves it in the other swarm's
  `p2p-rns`.
- **Reads through a relay.** The bridge holds a replica of the resource and
  serves it in the first swarm. Hypercore verifies every block against
  the owner's key, so a bridge is trusted for availability only, never for
  integrity: what arrives is exactly what the owner wrote.
- **Requests across.** A request for a repository in the other swarm goes
  through the bridge into that repository's inbox; there the bridge is the
  writer, flagged external, and the owner's intake applies its policy.
- **The bridge is a boundary**: what each swarm exposes to the other is a
  policy (`p2p-replicate`), and audit and metrics are taken there.
- **Swarm names** must then be unique beyond one swarm: a swarm's key is
  its identity, its friendly name an alias known to the swarms that
  bridge to it.

The same shape bridges a swarm and the outside world (hosted git, other
systems): the bridge is where the boundary is crossed.

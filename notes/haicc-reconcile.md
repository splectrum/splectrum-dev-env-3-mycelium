# haicc-reconcile

The first module of the HAICC family (`vision.md`: HAICC, human–AI
creative collaboration, the eventual tool for the whole cycle from idea to
deployment). `haicc-reconcile` is its deployment stage: a module declares
what it needs; the tool checks it, plans what is missing, and makes it so,
or says what only a human can do. The common pattern of deployments
(Kubernetes controllers, Terraform's plan and apply), kept small and our
own: JavaScript, records in topics, no foreign runtime.

Status: design, agreed 2026-11-02. First built in step 9.

## Requirements

A requirement is a fact a module needs: `{ kind, name, want }`.
- Declared beside the module's manifest (`requires.json`), read once at
  the boundary.
- Two forms:
  - **named**: this exact thing (`node master on host-a`);
  - **selected**: a kind, a type, a count (`at least n`, `exactly n`) and
    a configuration (`at least 2 nodes of type storage, with ...`).
    Node types and configurations are designed later, with real
    applications; a node requirement has `type` and `config` from the
    start, so the tool grows into them without changing shape.
- Requirements may depend on others (a swarm needs the node image; the
  image needs Docker and Bare): the engine orders them.

## Providers

One provider per kind: the only place that knows that kind (single
concern). A provider:
- `observe`s what is actually there;
- `compare`s it with what is wanted;
- for the kinds it may create, `apply`s a change.

Some kinds can only be checked (the OS, native Docker, the firewall):
they report what is missing and how to fix it, and never touch the
machine.

Where providers live (knowledge stays with its concern): the machine's
generic kinds (OS, Docker, runtimes and their versions, ports, subnets,
UDP reachability, folders) in `haicc-reconcile`; the kinds a module knows
in that module (the node image in `p2p-node-manager`, swarms and nodes in
`p2p-swarm-manager`, Splectral's configuration in Splectral).

## The engine

1. **check**: each requirement is one of
   - met;
   - missing, and the tool can create it;
   - missing, and only a human can fix it (with the hint);
   - different from what is declared;
   - extra: there, and not declared.
2. **plan**: the actions that would make the fixable ones true, in
   dependency order.
3. **apply**: carry out the plan, then check again. Idempotent: applying
   again changes nothing.

A command (`check`, `plan`, `apply`) and a library (Splectral's Run calls
it to reconcile its project's cluster before a run again).

## Modes and ownership

- **Non-strict (additive), the default**: make what is declared exist and
  be as declared; leave everything else. What is found beyond the
  manifest (an ad hoc node that joined) is reported as extra, never
  removed.
- **Strict (exact)**: also remove what is not declared. Chosen per scope,
  not per run: a demo's own host strict, a swarm with ad hoc joiners not.
- **Ownership**, in both modes: the tool changes or removes only what it
  created, which it marks as its own. Strict never removes what someone
  else started.

## Cold configuration: state apart from running

Agreed 2026-11-02. What must be true before anything runs is this tool's:
the machine checked, what is installed, the node image, the work folder,
a component's configuration. That **configuration state is repository
state**: it exists, and is checked and made true, whether or not anything
runs on top of it. **Running is a separate layer**, on top: a server up
or not is one more requirement, applied after the configuration and never
mixed with it. So stopping a server leaves its configuration as it was,
and reconciling the configuration does not need the server.

Splectral is the first use, inside a project: its configuration made
true, then its server running (`notes/splectral.md`).

## The deployment and its lifecycle: haicc-deployment

Agreed 2026-11-02. Two concerns, two modules:
- **`haicc-deployment`** owns a deployment as an object: the declared
  configuration and the desired lifecycle state. The verbs change only
  the desired state:
  - **deploy**: the configuration should exist;
  - **start**: running, on top of it;
  - **stop**: not running, the configuration kept;
  - **teardown**: the configuration removed (only what it owns).
  Every change is a record in the deployment's topic; its state is their
  fold.
- **`haicc-reconcile`** makes the world match the desired state: it reads
  what the deployment wants, compares, acts. It decides nothing itself.

A project (`haiccing`, e.g. `demo-liveness`) declares its deployment: the
cluster, Splectral's configuration and components, the server running.

## Authority: the swarm and the substrate

Agreed 2026-11-02 (`notes/node-pattern.md`, authority).
- **The swarm is the authority for all that is the swarm**: members,
  names, resources, and the swarm's part of a deployment, held as a
  repository on the swarm (the master), replicated.
- **The swarm and node managers are the authority for the substrate**:
  containers, networks, images, vaults, the host's resources.
- **A 100% split**: neither writes the other's domain. Nodes may hold a
  shadow copy of their managers' state, read-only.
- **Auto mode** is the one exception: a manager in auto mode accepts
  updates from the swarm (the deployment asks for two more nodes of a
  type: the manager creates their containers). Otherwise a manager only
  reports what the swarm's deployment would need of it.

Built in two steps: step 9 keeps the deployment on the host (topics in
the project's folder); the next step puts the swarm's part on the swarm,
as a repository on the master, with the managers' substrate apart and
auto mode.

## Records

Every check, plan and apply is produced into a topic (`mycelium-topic`,
Kafka records): what was wanted, what was found, what was done. Splectral
can show them.

## Later

- Allocation: a free subnet, a free port as requirements the tool
  satisfies, so several projects run side by side (concurrent demos).
- `p2p-propagate`: a desired state carried across a swarm, each node
  reconciling its part with this engine.
- The same pattern on a node itself: its packages and capabilities
  checked before it starts.

## Where it lives

`pear-full-square/haicc-reconcile`: engines (all code) live in
`pear-full-square`; the HAICC prefix names its layer (`vision.md`,
organisations).

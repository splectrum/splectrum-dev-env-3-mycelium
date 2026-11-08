# Splectral: design

Status: **proposed, 2026-11-01**, from the discussion after step 6. Not
started: no request yet. Name: **Splectral**. It is p2p infrastructure,
so it lives in `pear-full-square` (splectrum is the language medium, the
DSL platform to come: `vision.md`). Like the p2p series, it is made of
single-concern modules, each with its repository (below).

## Purpose

A platform for seeing and, later, working with the swarm. Its first use
is a viewer: a browser app that shows swarm and node activity, as shapes,
live:
- **Live demos to humans**, in addition to the closed-box tests, from
  the same runs.
- **A tool that shows how things work**: activity generated step by
  step, with explanatory messages alongside.
- **Later, a showcase for applications with a UI** on the swarm.

Then interaction: humans acting on the swarm and its repositories through
it, and applications with a UI built on it. It is a platform from the
start, so the viewer is its first set of extensions, not its limits.

It is developed and tested in the cloud (headless Chromium, Playwright),
then installed locally and seen running for real.

## A platform: viewer first, interaction later

The core is a shell that knows nothing of any page; everything a user
sees or does comes from extensions. What makes it a platform rather than
a viewer:

- **A contract for extensions**, versioned: what a source kind, page,
  scenario, action (and later an application) declares and may call.
  Extensions are written against the contract, never against the core's
  insides, so the core can change under them.
- **Two-way from the start.** The transport and the model carry actions
  and their results as well as events, even when the first pages only
  look. Scenarios already act; interaction adds a person as the one
  acting.
- **Actions as the one way to change anything.** Every change, by a
  scenario or a person, is a declared action through an existing path
  (managers, observers, peers), recorded with who asked for it and what
  came back. Nothing in the platform writes around them.
- **Who acts.** The viewer runs as the host's operator. Interaction
  needs identities: a person acting with a key of their own (a peer of
  the swarm under their own identity, owning what they create, as nodes
  do), and permissions per action. Designed for now, built with
  interaction.
- **Applications as extensions.** An application is pages, actions and
  its own state, possibly with a node-side part: the observer is the
  first node-side application, and others follow the same way.
- **Extensions as packages.** Found at start-up from folders first; later
  delivered like other code, as packages from the capability store.

| Stage | What it adds | Built on |
|---|---|---|
| viewer (step 7) | fixed pages, scenarios with messages, replay | sources, topics, the model, named actions for scenarios |
| interaction | people acting: requests, repository edits, managing nodes, from the pages | identities, permissions, actions recorded per person |
| applications | UI-based applications on the swarm, demoed and used in Splectral | the extension contract; node-side applications like the observer |

## Where it lives, and the boundary

- **The platform** is infrastructure, in `pear-full-square`: modules
  named `splectral-*`, single concern each, one dependency tree (npm
  workspaces, as the p2p series).
- **Applications on the platform** live in the **`splectral`**
  organisation: what people open and use, each application its own
  repository.
- **Applications are completely agnostic of p2p**, as mycelium is. They
  know an abstract world (below), never Hypercore, DHTs, keys or
  containers. All knowledge of p2p is in the platform's p2p adapters and
  in `splectral-p2p-observer` on the node. A test enforces it: no application
  imports from `p2p-*`.

### The abstract world (in the contract)

| | Vocabulary |
|---|---|
| **entities** | hosts, nodes, resources (by URI), links between them |
| **events** | joined, gone, absent, present, left, connected, disconnected, transferred (bytes), request sent, request answered, changed (a resource), say |
| **actions** | start a node, stop a node, restart a node, invite, send a request to a URI, write to a resource |
| **facts** | per entity: its URI, kind, state, who controls it (managed here or elsewhere), metrics |

The p2p adapters translate the observers', managers' and name service's
events into this vocabulary, and carry out its actions through managers,
observers and peers, as p2p-rns abstracts the swarm for mycelium. Another
adapter, for another kind of system, would show in the same applications
unchanged.

### Platform modules (`pear-full-square`)

| Module | Concern |
|---|---|
| `splectral-contract` | the extension contract, versioned: manifests (source kind, page, scenario, action, application), the abstract world, topic names, action declarations and results |
| `splectral-model` | events folded into a model of the abstract world; snapshots and changes; the same code in the server and the browser |
| `splectral-transport` | the stream between server and browser: snapshot, changes, actions and their results (WebSocket first, a worklet's IPC later) |
| `splectral-server` | the server's shell: extensions found, configuration, sources read and followed, topics announced, actions dispatched and recorded, the app served |
| `splectral-shell` | the browser's shell: the menu from the topics, routing, applications and pages hosted, the transport's client |
| `splectral-replay` | a generic source kind: any topic consumed from offset 0 at a chosen speed |
| `splectral-scenario` | the generic scenario runner: steps, actions, `await`s, `say` messages, recorded |
| `splectral-timeline` | a generic page: every event, scrubbable |
| `splectral-p2p-watchers` | the p2p adapter in: source kinds `repository`, `core`, `swarm` (later `docker`), and the mapping of the managers' and observers' records to the abstract world |
| `splectral-p2p-actions` | the p2p adapter out: the abstract actions through the managers' operations, requests and the observers' named actions |

On the node side, part of the platform's p2p adapter:
**`splectral-p2p-observer`**, the privileged node application (below). The managers' topics (through `mycelium-topic`) and the master's
provisioning through the auxiliary swarm are changes to
`p2p-node-manager`, `p2p-swarm-manager` and `p2p-node`.

### Applications (`splectral`)

Named **package, kind, name**: `<package>-<kind>-<name>`, the package a
consistent set shipped, validated and loaded as a whole; kinds `view`
(views of the abstract world) and `demo` (scenarios with their messages).
`base` is the package that comes with the platform. Later, in the same
way: `base-view-node`, `base-demo-provisioning`; other packages under
prefixes of their own. No p2p word in application names (not "swarm").

| Application | What |
|---|---|
| `base-view-map` | the map of hosts, nodes and resources with activity drawn live; a node's events, a manager's events, metrics |
| `base-demo-other-host` | step 6 as a scenario in the abstract vocabulary: a node on another host joins, a request crosses, the node stops while the swarm runs on; with its messages |

The swarm map is an application, not platform: one way of presenting the
abstract world; others can be built on the same sources and actions.
Built outside the platform, it also tests the contract: if it works as an
outside application, the platform is a platform.

## The parts, end to end

```
node (container)                        host
┌──────────────────────────┐            ┌──────────────────────────────────────┐
│ the node's modules ──events──┐        │ node manager ── topics (mycelium-topic)│
│                          │   │        │      │                               │
│ observer (an application │◄──┘        │      └─ followed ────┐               │
│ on the node, privileged) │◄─mgmt ch.─►│                      ▼               │
└──────────────────────────┘            │            Splectral server ── browser(s) │
          ▲                             │              │  (sources → topics)   │
          └──────── the swarm (data plane) ─── peer ───┘                       │
                                        └──────────────────────────────────────┘
```

1. **The observer**, an application on every node that runs one.
2. **The management channel**, between the node and its own manager:
   the auxiliary link that provisioning sets up and keeps open.
3. **The node manager's topics**, on the host: the node's and its own,
   append-only (`topics.md`).
4. **The Splectral server**, one per host: sources in, topics out, the app
   served to browsers.
5. **The app** in the browser: a menu of pages and scenarios.

## The observer: a privileged application on the node

A node hosts applications, its repositories among them. The observer is
one more, privileged in a narrow, defined way.

- **Sees inside the node.** It receives every module's events (the
  instrumentation observer the node already gives its modules) and reads
  the node's live state on demand: connections, replication, resources,
  metrics, the name service as the node sees it.
- **Acts inside the node.** It can carry out named actions for demos and
  explainers: write to a repository, send a request, open a connection.
  Only named actions, each declared and recorded.
- **Never sees a secret.** Events exclude secrets by the series'
  contract, and it gets no access to the store's keys. Its privilege is
  visibility and named actions.
- **Answers only its own manager.** It talks over the management
  channel, which is host-local and authenticated by key. It is registered
  on the node (e.g. `/<swarm>/<node>/observer`), which makes it known and
  addressable but not open to the swarm.
- **Granted by the manager.** Whether a node runs the observer is part of
  what its manager provisions; a production node can run without it.
- **Costs the image nothing.** Its code travels in the packages by
  replication, like the rest of the node.
- **Later: the node's audit as a core.** The observer publishes the
  node's audit as an append-only core of its own, registered in the name
  service (`/<swarm>/<node>/audit`) and followed by replication. This is
  what makes another host's nodes visible without servers or copying, and
  it settles the open question of where audit goes (step 2).

## The managers' part

- **The management channel for every node.** A joining node has one
  since step 5. The master gets its secret on stdin and has none: the
  master is provisioned through the auxiliary swarm too (carried forward
  from step 5) before it gets an observer.
- **Topics, not a feed.** Each node manager produces what it learns into topics
  in the node's folder (`topics.md`, through `mycelium-topic`): the node's
  topic (the observer's events) and its own. Splectral consumes and
  follows them from an offset; nothing else is needed to carry them. Their
  state files (`state.json`) become views folded from the topics.
- **Actions are records too.** An action for a node is appended to the
  node's action topic, which its manager follows; the manager carries it
  out, or passes it to the observer over the management channel, and
  produces the result into the node's topic, correlated with the action
in a header.
- **The topics are the durable truth**, written whether anyone watches or
  not; replay is consuming them from an earlier offset.
- **What only the manager sees comes from the manager**: container exits,
  out-of-memory kills, resource samples.

## The Splectral server

One per host. It is a management-plane application, outside the p2p
layer: the modules do not know it.

**Sources.** Configured, each a URI to an object or a topic (`topics.md`):
every read returns an array of records; a topic is consumed from an offset and
followed. A source says what it holds, and announces the **topics** it
provides. Source kinds are watcher types, generic by where data lives:

| Source kind | Where the data lives | From |
|---|---|---|
| `file` | objects and topics in folders on the host: the managers' topics, a step's records | the platform |
| `repository` | objects and topics in a repository's layer, by URI, from a replica | the p2p adapter |
| `core` | topics on cores (later: the nodes' audit cores) | the p2p adapter |
| `swarm` | the name service, as a peer: who is in the swarm, their resources by URI | the p2p adapter |
| `docker` | a swarm's containers and networks starting, stopping, dying, as records | the p2p adapter |
| `replay` | any topic consumed from offset 0 at a chosen speed | the platform |

**Records.** Everything is a record compatible with Kafka's, for now
partial: the data in `value`, JSON, taken in offset order (`topics.md`),
read by its shape. Scenario messages are records too (kind `say`).

**The model** folds records, in offset order, into the abstract world:
the fold gives the state; the records in order give the activity. It pushes a
snapshot and then the changes to every connected browser (a WebSocket or
Server-Sent Events). It is a Node server serving a React app; no
server-side rendering.

**Actions** are records produced into action topics, and go through the
existing paths only:
- the managers' operations: join, restart, stop, invite;
- the observers' named actions, through their managers;
- peer operations: requests, as `request.mjs` does.

The Splectral server never reads a vault, and its configuration has no field
for one.

## The app: extensions, menu and pages

A small core; everything else is an extension. Each extension is a folder
with a manifest, found at start-up, so adding one never touches the core.

| Extension kind | What it is | Declares |
|---|---|---|
| **Watcher type** | a source of events | its settings; the topics it provides |
| **Page** | a view: a React component, optionally with a server part folding events into its own state | the topics it needs; its place in the menu |
| **Scenario** | a demo or explainer: steps generating activity, with messages | the topics it needs; the actions it uses; the pages to show while it runs |
| **Action** | something that makes activity happen | the manager, observer or peer operation it calls |

**The menu follows what is available.**
- The running sources announce their topics.
- A page appears in the menu when the topics it needs are there.
- A parameterised page appears once per instance found, under its URI:
  one "node log" page per node.
- Pointed at a replay, the menu shows that run's nodes. Pointed at a live
  swarm, it grows as nodes join.

**Fixed pages**, one per kind of record or state:
- **the swarm map**: hosts as frames, nodes as shapes (controlled or not),
  resources by URI, the data plane and each host's management plane as
  different lines; activity drawn live (connections opening, replication
  as pulses sized by bytes, requests as tokens travelling and coming
  back, a stopped node fading);
- **a node's events**;
- **a node manager's events**;
- **a resource**: branches, `pending/default`, responses;
- **the timeline**: every event, scrubbable in replay;
- **metrics**.

**Scenario pages: demos and explainers.** A scenario is a script of
steps:

```json
{ "say": "Host B knows only the invitation: public keys and addresses.", "show": ["swarm-map"] }
{ "do": "join-from-invitation", "with": { "name": "remote-1" }, "await": "node:/hosts/remote-1/started",
  "say": "Its own manager provisions it, on host B's own auxiliary network." }
{ "do": "request", "with": { "to": "/hosts/remote-1/node" }, "await": "resource:/hosts/remote-1/node/response",
  "say": "A request crosses the hosts: in as a bundle, out on main." }
```

- **The activity is real**: actions drive managers, observers and peers,
  and the pages show the events that come back. A scenario can also run
  against a recording when no swarm is at hand.
- **The messages are events.** They go into the timeline and are recorded
  with the run, so a demo replays with its explanations.
- **A scenario is a test.** Each step's `await` is an expectation, so a
  demo run is a recorded run and can be checked like the closed-box
  tests: one script serves as demo, explainer and test.

**Later, by the same mechanism**, with no new core concepts:
- **application pages**: UI-based applications on the swarm, shown next
  to the swarm map;
- **explainer tours**: provisioning, replication, the name service,
  requests, each a scenario generating activity with its messages.

**The pages read a client-side model, not the server.** The model
receives the event stream over a transport: a WebSocket to the view
server in a browser, later the IPC pipe to a device's own Bare worklet.
So the same pages serve a viewer and a future mobile node app.

## Across hosts and devices

- **Each host's Splectral server** shows its own nodes live and two-way,
  through their managers.
- **Other hosts' nodes** come through the swarm: the name service and
  replicas now, the nodes' audit cores later.
- **The simulation of step 6** has both hosts' folders on one machine,
  so one Splectral server covers both.
- **Tablets and phones:**
  - **As viewers**: they open the app in their browser on the local
    network, with no wrapping. The layout works on small screens from the
    start. It can be installed as a progressive web app, or wrapped as a
    store app with Capacitor (light work for an SVG-based UI).
  - **As nodes**: a web view cannot open UDP sockets, so a device node
    needs Bare in a worklet next to the UI, with a bridge (Bare Kit; for
    Capacitor, likely a plugin of our own). There the app is the node's
    manager and shows its own pages; for the rest it is a peer. A separate
    project, after liveness.

## Testing

- **In the cloud**: the server, its sources and a swarm in Docker;
  headless Chromium driven by Playwright. Tests assert on the page:
  - the menu's pages;
  - the shapes for nodes and resources by URI, and their states;
  - a request token reaching its node;
  - a scenario's messages appearing in order.
- **Replay** of a recorded run at a fixed speed gives the same pages
  every time: compared run against run, and the drawn state checked
  against the record.
- **Live**: a scenario run against a swarm, its `await`s the expectations.
- **Records**: screenshots, and videos or traces where useful, go into
  the step's `record/` folder; the UI tests are cases in
  `steps/record.sh`.
- **Locally**: the app installed from the local-machine instructions, its
  configuration pointing at the local swarm. Running the UI tests there
  needs Playwright's browser (`npx playwright install chromium`); seeing
  the app needs only a browser.

## Running Splectral: configuration, then the server on top

Agreed 2026-11-02.
- **Two states, kept apart.** A Splectral instance's configuration (its
  folder: the configuration, its topics, its runs) is repository state,
  made true cold by `haicc-reconcile`, before and independent of any
  server. The server runs on top of it; up or down changes nothing in the
  configuration.
- **Talking to the server is producing and consuming topics**, the pattern
  a node's manager and observer already use: a client produces an action
  record into an action topic of its own (one producer per partition), a
  correlation id in a header; the server follows every client's action
  topic from its committed offset, acts, and produces the result into its
  results topic with the same correlation id; the client follows that. An
  action produced while the server is down waits for it. The topics are
  the audit. Today topics on host folders; on cores later, and a client
  elsewhere reaches the server the same way.
- **HTTP only at the browser's boundary**: a page cannot read the host's
  topics, so the transport is the browser's adapter onto the same topics
  (a click is an action record; the live view comes from the topics).
- **Bringing it up is a project's lifecycle** (`haicc-deployment`:
  deploy, start, stop, teardown): Splectral's configuration, then its
  server running, as part of the project's deployment; the browser opened.
  Commands once it runs are a client producing actions and following
  results. No launcher module.
- Latency (following polls) is no issue now; change notifications can
  replace polling behind the same `follow` later.

## Demos as projects

Agreed 2026-11-02 (replacing setups as a Splectral kind). A demo, whole, is
a project (`haiccing`, e.g. `haiccing/demo-liveness`): a specific test
cluster, a Splectral install on top with the components it needs, and the
scenario to run. Its configuration is a HAICC deployment
(`notes/haicc-reconcile.md`), made true by `haicc-reconcile`.
- **Components stay agnostic** (`splectral`): a demo's scenario names no
  setup; the project around it provides the world.
- **Splectral is installed and configured by the project**, and knows the
  project it was started for. Run again: the project's cluster reconciled
  back to its declaration, then the scenario played.
- **One active project per machine** for now (fixed addresses); several
  side by side later, when addresses are allocated.
- Splectral has no `setup` extension kind.

## Rules

- **No secret anywhere in the app**: not in the observer, the topics, the
  Splectral server, the model, the pages or the records.
- **No web server on the nodes.** The observer talks only to its manager,
  over the management channel; the node's other ways in stay p2p.
- **Observing and driving only through existing paths**: managers,
  observers' named actions, peers.
- **The records stay the truth**: the app reads them, never replaces them.
- **Outside the p2p layer.** The platform is in `pear-full-square` as
  management-plane infrastructure; the observer is a node application.
- **Applications know no p2p.** They work in the abstract world only; no
  application imports from `p2p-*` (a test checks it).

## When built: the steps

**Step 7, the app with live demos on one host and the simulated two:**
- `mycelium-topic` (`topics.md`): the managers' records become topics, their
  state files views;
- the master provisioned through the auxiliary swarm, so every node has
  a management channel;
- the observer on every node, its events in its manager's topics;
- the platform's core: the contract with the abstract world, the model,
  the transport, the server, the shell, the menu;
- the generic extensions: replay, scenario runner, timeline;
- the platform's `file` source; the p2p adapters: sources `repository`
  and `swarm`, the records' mapping, and the
  abstract actions (start, stop, invite, request);
- the applications `base-view-map` and `base-demo-other-host` (step 6 as a
  scenario), live and replayed, agnostic of p2p.

Validated by:
1. replaying step 6's record and checking the drawn state against it;
2. running the step 6 scenario live, recorded, its expectations met;
3. the headless browser tests recorded.

**Next:**
- nodes' audit cores and the `core` source following them, so the
  view works across real machines;
- the `docker` source, the resource page, more scenarios;
- liveness in the name service, which the swarm map will make visible
  (done in step 8: presence in the abstract world, contract 0.2).

## Open


1. **The observer's named actions**: which ones step 7 needs, and how
   each is declared and recorded.
2. **The audit core**: its format, signing, and what goes in it (all
   events, or audit only, with metrics summarised).
3. **The extension contract**: its first version, and how it is
   versioned as interaction and applications arrive.
4. **Towards a platform for a solution's components** (`vision.md`: the
   future vision, step by step). The human's feedback from the local run
   of the demos (`steps/9-click-and-run/demos-local-run.md`), noted, not
   scheduled:
   - the demo app (a solution) as one tab with its own left-hand menu, its
     components (scenario, map, timeline, a node) as tabs inside it;
     today each menu link opens a tab of its own;
   - time on every screen (the map, the scenario's page, the node pages),
     not only the timeline.

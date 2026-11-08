# hosts

The swarm of the demo: its master, which keeps the names (p2p-rns), and
node-1, which renews its lease with the master every few seconds. Each in a
container of its own on this host, running the p2p node from the master's
`packages/`. Its Splectral server, on the host: the swarm watched (the
containers' logs), acted on (pause, resume, stop, start a node; a request
to a node), and the scenario `liveness` played, at http://127.0.0.1:4400.

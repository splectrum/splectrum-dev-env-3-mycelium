# liveness

The demo as a user runs it: a fresh install inside this test's run,
`./boot`, `./haicc boot base-demo-liveness` (the swarm `hosts`: the master
and node-1 in their containers; the Splectral server at
http://127.0.0.1:4400), the page answering, the scenario `liveness` played
through the server as the page's Run does it (node-1 frozen and flagged
absent when its lease runs out, a request to it refused, thawed and present
again, a request answered, node-1 stopped and leaving), then the swarm torn
down with its server, nothing left in Docker. The platform's default
teardown removes the run, the install with it.

# other-host

The demo as a user runs it: a fresh install inside this test's run,
`./boot`, `./haicc boot base-demo-other-host` (host A: the swarm `hosts`,
the master and node-1 in their containers, the Splectral server at
http://127.0.0.1:4400), the page answering, the scenario `other-host`
played through the server as the page's Run does it (host B invited, its
node manager joining remote-1 from the invitation with host B's vault and
the master's code, a request from host A answered by remote-1, a note
written on its repository, remote-1 stopped, the swarm running on), then
torn down, nothing left in Docker. The platform's default teardown removes
the run, the install with it.

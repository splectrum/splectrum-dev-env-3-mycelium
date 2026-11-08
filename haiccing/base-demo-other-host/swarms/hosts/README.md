# hosts

The swarm of the demo, on host A: its master and node-1, each in a container
of its own, run by HAICC. Host B, a host of its own (its folder, its vault,
its node manager: `hosts/splectral/hosts/host-b/`), runs nothing until it is
given an invitation: then its node manager joins its node, which takes its
key from host B's vault and its code from the master, over the swarm. The
Splectral server on host A shows both hosts and plays the scenario
`other-host`, at http://127.0.0.1:4400.

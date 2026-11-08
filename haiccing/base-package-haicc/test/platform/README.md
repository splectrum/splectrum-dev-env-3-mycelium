# platform

The platform as it ships: from the package under test, its setup built; a
fresh install set up inside this test's run (`install/`, sourced from the
same haiccing/, nothing from the network); booted (cold, then warm); a swarm
and two nodes (each node's cold boot: the platform's package only; its warm
boot: the self-test); every level shut down and booted again; the teardown
of the swarm; the cold shutdown; `./boot` again. The platform's default
teardown removes the run, the install with it.

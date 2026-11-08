// The swarm's part of a deployment (step 10): what the swarm wants, kept by
// the master in its `deployment` repository (`deployment.json` on main;
// each change a commit). The swarm is its authority; the managers follow it.
//   { "swarm": "<name>", "nodes": [ { "name": "node-1" }, { "prefix": "node-", "atLeast": 2 } ] }
// A node is named, or selected (a prefix and a count); `type` and `config`
// are reserved for node types and configurations, not yet used.
//   checkDeployment(value, swarm)   the boundary: a deployment from a request, checked once
import { validateName } from '../mycelium-uri/index.js'

export function checkDeployment (d, swarm) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('a deployment is an object')
  if (d.swarm !== swarm) throw new Error(`a deployment of swarm ${d.swarm}, not ${swarm}`)
  if (!Array.isArray(d.nodes)) throw new Error('a deployment lists its nodes')
  const names = new Set()
  for (const n of d.nodes) {
    if (n.name !== undefined) {
      validateName(n.name, 'node name')
      if (n.name === 'master') throw new Error('the master is not deployed: it holds the deployment')
      if (names.has(n.name)) throw new Error(`a node twice: ${n.name}`)
      names.add(n.name)
    } else {
      validateName(`${n.prefix}1`, 'node name prefix')
      if (!Number.isInteger(n.atLeast) || n.atLeast < 0) throw new Error('a selection says atLeast, a count')
    }
    for (const k of Object.keys(n)) if (!['name', 'prefix', 'atLeast', 'type', 'config'].includes(k)) throw new Error(`not a node's field: ${k}`)
  }
  return { swarm: d.swarm, nodes: d.nodes }
}

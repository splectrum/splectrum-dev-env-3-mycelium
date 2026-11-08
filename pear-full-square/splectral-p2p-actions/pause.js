// pause-node { node } / resume-node { node }: the node's container frozen
// and thawed (docker pause / unpause), on the host whose HAICC runs it.
// A frozen node says nothing and no graceful path sees it: the swarm only
// notices when its lease runs out.
import { findNode, run } from './lib/hosts.js'

export const freeze = verb => async ({ node }, ctx) => {
  const { config, state } = await findNode(ctx.config, node)
  const want = verb === 'pause' ? 'running' : 'paused'
  if (state !== want) throw new Error(`not ${want}: ${node} (${state})`)
  const r = run('docker', [verb, config.container])
  if (!r.ok) throw new Error(`docker ${verb}: ${r.err}`)
  return { node, [verb === 'pause' ? 'paused' : 'resumed']: true }
}

export default freeze('pause')

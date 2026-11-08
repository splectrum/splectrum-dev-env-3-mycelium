// stop-node { node }: the node shut down by its own HAICC
// (<swarm>/<node>/haicc shutdown): its container stopped gracefully (the
// node leaves the swarm's names first), then removed; its folder kept, so
// start-node brings it back. A stop that does not complete fails.
import { existsSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { findNode, run, containerState, sleep } from './lib/hosts.js'

// The node's HAICC as its own: no level's settings passed on.
export const quiet = { HAICC_WORK: '', HAICC_SWARM: '', HAICC_NOLOG: '', HAICC_AS: '' }

const alive = pid => run('kill', ['-0', String(pid)]).ok

export default async ({ node, timeout = 60000 }, ctx) => {
  const { folder, config, managed } = await findNode(ctx.config, node)
  // A node a node manager runs (joined by invitation, on a host of its
  // own): its manager stopped (SIGTERM), which stops the node gracefully;
  // waited for by the process signalled.
  if (managed) {
    const pidFile = join(folder, 'manager.pid')
    if (!existsSync(pidFile)) throw new Error(`no manager running for ${node}`)
    const pid = readFileSync(pidFile, 'utf8').trim()
    run('kill', [pid])
    const t0 = Date.now()
    while (alive(pid)) {
      if (Date.now() - t0 > timeout) throw new Error(`${node}'s manager (pid ${pid}) did not stop within ${timeout} ms`)
      await sleep(100)
    }
    return { node, stopped: true }
  }
  const r = run(join(folder, 'haicc'), ['shutdown'], quiet)
  if (!r.ok) throw new Error(`${node}: its shutdown ended with exit ${r.status}: ${r.out.split('\n').slice(-2).join(' ')}`)
  const state = containerState(config.container)
  if (state !== 'gone') throw new Error(`${node} still there after its stop (${state})`)
  return { node, stopped: true }
}

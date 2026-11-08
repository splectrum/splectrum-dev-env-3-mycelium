// The hosts this server may act on, from its configuration:
//   config.hosts = { '<host>': { folder, vault?, boot? } }
//     folder   a swarm's folder, as HAICC runs it; or, for a host of its own,
//              the folder of its node managers (one folder per node)
//     vault    that host's vault (its nodes' keys); boot: the boot program's
//              code there (an assembled package folder)
// A node is found by its URI among the node folders there (their configs,
// node.json); its container's state from Docker.
import { readdirSync, existsSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { spawnSync } from 'bare-subprocess'
import process from 'bare-process'

export function hostOf (config, host) {
  const h = config.hosts?.[host]
  if (!h) throw new Error(`no host: ${host}`)
  return h
}

export const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } })
  return { ok: r.status === 0, status: r.status, out: String(r.stdout || '').trim(), err: String(r.stderr || '').trim() }
}

// A container's state: running, paused, exited, ..., or gone.
export const containerState = container => {
  const r = run('docker', ['inspect', '-f', '{{.State.Status}}', container])
  return r.ok ? r.out : 'gone'
}

export function nodeConfig (folder) {
  const f = join(folder, 'node.json')
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null
}

// A node by its URI: one HAICC runs (its folder holds node.json), or one a
// node manager runs (its folder holds the manager's topics: a node joined
// by invitation, on a host of its own).
export async function findNode (config, uri) {
  for (const [host, h] of Object.entries(config.hosts || {})) {
    if (!existsSync(h.folder)) continue
    for (const name of readdirSync(h.folder).sort()) {
      const folder = join(h.folder, name)
      const c = nodeConfig(folder)
      if (c && `/${c.swarm}/${c.name}` === uri) return { host, folder, config: c, state: c.container ? containerState(c.container) : 'none' }
      if (existsSync(join(folder, 'topics', 'manager'))) {
        const { nodeState } = await import('../../p2p-node-manager/index.js')
        const st = await nodeState(folder)
        if (st && st.uri === uri) return { host, folder, managed: st, config: { container: st.container }, state: st.status === 'running' ? containerState(st.container) : st.status }
      }
    }
  }
  throw new Error(`no node here: ${uri}`)
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The source kind `haicc-swarm`: a swarm's nodes on this host, as HAICC
// runs them (a container each, its config in <swarm>/<node>/node.json).
//   { kind: 'haicc-swarm', host: 'host-a', folder: <the swarm's folder>, scanEvery }
// Each node's container log (the node's JSON lines: every module's events)
// is followed from its start (`docker logs -f`): a record per line, holding
// `haicc-node/log`; its following and its end are records too, holding
// `haicc-node/container`. The folder is scanned again, so a node started
// later, or started again (a new container), is followed too.
import { readdirSync, existsSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { spawn, spawnSync } from 'bare-subprocess'

const inspect = (container, format) => {
  const r = spawnSync('docker', ['inspect', '-f', format, container], { stdio: ['ignore', 'pipe', 'ignore'] })
  return r.status === 0 ? String(r.stdout).trim() : null
}

// The nodes of the swarm's folder that have a container: their configs.
export function nodesIn (folder) {
  if (!existsSync(folder)) return []
  const out = []
  for (const name of readdirSync(folder).sort()) {
    const f = join(folder, name, 'node.json')
    if (!existsSync(f)) continue
    try { const c = JSON.parse(readFileSync(f, 'utf8')); if (c.container) out.push(c) } catch {}
  }
  return out
}

export default async function haiccSwarm (cfg, platform) {
  const followed = new Map() // container id -> its `docker logs -f`
  const follow = (id, c) => {
    const context = { host: cfg.host, uri: `/${c.swarm}/${c.name}`, container: c.container }
    const record = (holds, value) => platform.mapRecord({ holds, context }, { value: { time: Date.now(), ...value } })
    record('haicc-node/container', { kind: 'following', role: c.role })
    const child = spawn('docker', ['logs', '-f', id], { stdio: ['ignore', 'pipe', 'ignore'] })
    followed.set(id, child)
    let rest = ''
    child.stdout.on('data', chunk => {
      rest += String(chunk)
      let i
      while ((i = rest.indexOf('\n')) !== -1) {
        const line = rest.slice(0, i)
        rest = rest.slice(i + 1)
        let v
        try { v = JSON.parse(line) } catch { continue }
        platform.mapRecord({ holds: 'haicc-node/log', context }, { value: v })
      }
    })
    child.on('exit', () => {
      if (child.stopped) return
      const code = inspect(id, '{{.State.ExitCode}}')
      record('haicc-node/container', { kind: 'exited', exitCode: code === null ? null : Number(code) })
    })
  }
  const scan = () => {
    for (const c of nodesIn(cfg.folder)) {
      const id = inspect(c.container, '{{.Id}}')
      if (id && !followed.has(id)) follow(id, c)
    }
  }
  scan()
  const timer = setInterval(scan, cfg.scanEvery ?? 1000)
  return {
    stop: async () => {
      clearInterval(timer)
      for (const child of followed.values()) { child.stopped = true; try { child.kill() } catch {} }
    }
  }
}

// The source kind `p2p-host`: a host of its own, its nodes run by node
// managers (joined by invitation), a folder each under the host's folder.
//   { kind: 'p2p-host', host: 'host-b', folder, every, scanEvery }
// Every folder holding a manager's topics is followed, as the platform's
// `file` source: its `topics/manager` (`p2p-node-manager/manager`) and its
// `topics/node` (`p2p-node/log`). The folder is scanned again, so nodes that
// come later are followed too.
import { readdirSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'

const KINDS = [['manager', 'p2p-node-manager/manager'], ['node', 'p2p-node/log']]

function topicsIn (cfg) {
  const out = []
  if (!existsSync(cfg.folder)) return out
  for (const name of readdirSync(cfg.folder).sort()) {
    for (const [t, holds] of KINDS) {
      const path = join(cfg.folder, name, 'topics', t)
      if (existsSync(path)) out.push({ kind: 'file', path, holds, context: { host: cfg.host, folder: name }, every: cfg.every })
    }
  }
  return out
}

export default async function p2pHost (cfg, platform) {
  const followed = new Map()
  const scan = async () => {
    for (const topic of topicsIn(cfg)) {
      if (followed.has(topic.path)) continue
      followed.set(topic.path, await platform.startSource(topic))
    }
  }
  await scan()
  const timer = setInterval(() => { scan().catch(() => {}) }, cfg.scanEvery ?? 1000)
  return { stop: async () => { clearInterval(timer); for (const s of followed.values()) await s.stop?.() } }
}
p2pHost.topicsOf = cfg => topicsIn(cfg)

// invite { from, to }: host `from`, running the swarm, gives host `to` an
// invitation (public facts only, no secret), as a file in that host's
// folder: the swarm, its network, the master's key and DHT, the packages
// the master runs (their key and commit, from its genesis), the image.
import { writeFileSync, mkdirSync, readdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { hostOf, nodeConfig, run } from './lib/hosts.js'

export function invitation (h) {
  const master = readdirSync(h.folder).sort().map(n => nodeConfig(join(h.folder, n))).find(c => c?.role === 'master')
  if (!master?.live?.dht) throw new Error(`no master running in ${h.folder}`)
  const net = run('docker', ['network', 'inspect', '-f', '{{(index .IPAM.Config 0).Subnet}} {{(index .IPAM.Config 0).Gateway}}', master.network])
  if (!net.ok) throw new Error(`no network ${master.network}`)
  const [subnet, gateway] = net.out.split(' ')
  const genesis = run('docker', ['logs', master.container]).out.split('\n').map(l => { try { return JSON.parse(l) } catch { return null } }).find(e => e?.module === 'p2p-node' && e.kind === 'genesis')
  if (!genesis) throw new Error(`the master ${master.container} has no genesis in its log`)
  const image = run('docker', ['inspect', '-f', '{{.Config.Image}}', master.container]).out
  return {
    swarm: master.swarm,
    network: { name: master.network, subnet, gateway },
    bootstrap: master.live.dht,
    master: master.live.key,
    packages: { uri: `/${master.swarm}/${master.name}/packages`, key: genesis.packages.key, commit: genesis.packages.commit },
    image
  }
}

export default async ({ from, to }, ctx) => {
  const inv = invitation(hostOf(ctx.config, from))
  const dir = hostOf(ctx.config, to).folder
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'invitation.json'), JSON.stringify(inv, null, 2) + '\n')
  return { swarm: inv.swarm, to }
}

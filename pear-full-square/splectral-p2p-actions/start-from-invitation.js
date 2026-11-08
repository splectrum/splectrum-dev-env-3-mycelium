// start-node-from-invitation { host, name, ip?, auxSubnet }: the host's own
// node manager joins a node from the invitation it was given, with the
// host's vault and its boot program's code (the host's config: vault,
// boot); it runs detached, for the node's life, in a folder of its own
// (<host's folder>/<swarm>-<name>). Its address on the swarm's network: `ip`,
// else .100 of the invitation's subnet.
import { existsSync, readFileSync, mkdirSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import process from 'bare-process'
import { hostOf, run, sleep } from './lib/hosts.js'

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'p2p-node-manager', 'cli.js')

export default async ({ host, name, ip, auxSubnet, timeout = 180000 }, ctx) => {
  const h = hostOf(ctx.config, host)
  const invitation = join(h.folder, 'invitation.json')
  if (!existsSync(invitation)) throw new Error(`${host} has no invitation`)
  const inv = JSON.parse(readFileSync(invitation, 'utf8'))
  if (!ip) { const [a, b, c] = inv.network.subnet.split('/')[0].split('.'); ip = `${a}.${b}.${c}.100` }
  const folder = join(h.folder, `${inv.swarm}-${name}`)
  mkdirSync(folder, { recursive: true })
  rmSync(join(folder, 'state.json'), { force: true })
  const t0 = Date.now()
  // In a session of its own, so it outlives the action; its output in its folder.
  const r = run('sh', ['-c', 'setsid "$@" >> "$OUT" 2>&1 < /dev/null &', 'sh', process.execPath, cli, 'join',
    `--invitation=${invitation}`, `--folder=${folder}`, `--vault=${h.vault}`, `--boot=${h.boot}`, `--name=${name}`, `--ip=${ip}`, `--aux-subnet=${auxSubnet}`, '--observer=true'],
  { OUT: join(folder, 'manager.out') })
  if (!r.ok) throw new Error(`${name}: its manager could not be started: ${r.err}`)
  const { nodeState } = await import('../p2p-node-manager/index.js')
  while (Date.now() - t0 < timeout) {
    const st = await nodeState(folder)
    if (st && st.startedAt && new Date(st.startedAt).getTime() >= t0 - 1000) {
      if (st.status === 'running') return { uri: st.uri, ms: Date.now() - t0 }
      if (st.status === 'exited') throw new Error(`${name} exited before it was ready`)
    }
    await sleep(500)
  }
  throw new Error(`${name}: not ready within ${timeout} ms`)
}

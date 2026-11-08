// The machine's generic kinds. Most are checked only: they report what is
// missing and how to fix it. The host's prerequisites (git, Docker Engine
// installed, running, the user in its group) are fixed too, each only with
// a person's yes (ctx.ask), and with sudo where it needs it:
//   git              { atLeast: '2.25' }   installed with apt
//   docker-installed {}                    Docker Engine (docker.io) installed with apt
//   docker-running   {}                    its daemon started
//   docker-group     {}                    the user in the docker group (holds from the next login)
//   os       { platform: 'linux', arch: 'x64' }
//   docker   { native: true }              Docker Engine, rootful, not Docker Desktop
//   bare     { runtime: '1.36.0' }         Bare's runtime: the binary images are built with
//   subnet   { cidr: '172.34.0.0/24', network }   free, or held by that Docker network
//   udp      { network: 'bridge' }         a container reaches the host's address on it by UDP
import { spawnSync } from 'bare-subprocess'
import dgram from 'bare-dgram'
import process from 'bare-process'

const has = cmd => spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0
const atLeast = (v, min) => { const a = v.split('.').map(Number); const b = String(min).split('.').map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i] } return true }
const root = () => run('id', ['-u']) === '0'
// A change to the machine: asked first; run (with sudo unless root),
// its output the person's to see.
async function change (ctx, what, cmds) {
  if (!ctx.ask) throw new Error(`not done: ${what} (needs a yes: nothing here to ask)`)
  if (!(await ctx.ask(what))) throw new Error(`not done: ${what} (declined)`)
  for (const c of cmds) {
    const argv = root() ? c : ['sudo', ...c]
    const r = spawnSync(argv[0], argv.slice(1), { stdio: ['ignore', 'inherit', 'inherit'] })
    if (r.status !== 0) throw new Error(`${argv.join(' ')}: exit ${r.status}`)
  }
  return { done: what }
}

export const git = {
  observe () { const v = run('git', ['--version']); return v ? { version: v.split(' ')[2] } : null },
  compare: (r, a) => a && atLeast(a.version, r.want.atLeast ?? '0') ? { status: 'met', detail: a } : { status: 'missing', detail: a ? `${a.version}, ${r.want.atLeast} or later needed` : 'not installed' },
  create: (r, ctx) => change(ctx, 'install git with apt', [['apt-get', 'update', '-q'], ['apt-get', 'install', '-y', '-q', 'git']]),
  hint: r => `git ${r.want.atLeast} or later is needed: install it (apt-get install git)`
}

export const dockerInstalled = {
  observe: () => has('docker') ? { version: (run('docker', ['--version']) || '').split(' ')[2]?.replace(',', '') } : null,
  compare: (r, a) => a ? { status: 'met', detail: a } : { status: 'missing', detail: 'not installed' },
  create: (r, ctx) => change(ctx, 'install Docker Engine (docker.io) with apt', [['apt-get', 'update', '-q'], ['apt-get', 'install', '-y', '-q', 'docker.io']]),
  hint: () => 'Docker Engine is needed: install it (apt-get install docker.io)'
}

export const dockerRunning = {
  observe: () => run('docker', ['version', '--format', '{{.Server.Version}}']) ? { running: true } : { running: false },
  compare: (r, a) => a.running ? { status: 'met' } : { status: 'missing', detail: 'not reachable (not running, or no access: docker-group)' },
  create: (r, ctx) => change(ctx, 'start the Docker daemon', [has('systemctl') ? ['systemctl', 'start', 'docker'] : ['service', 'docker', 'start']]),
  hint: () => 'start the Docker daemon (systemctl start docker, or service docker start)'
}

export const dockerGroup = {
  observe () {
    if (root()) return { member: true, as: 'root' }
    const now = (run('id', ['-nG']) || '').split(' ').includes('docker')
    const listed = (run('getent', ['group', 'docker']) || '').split(':')[3]?.split(',').includes(run('id', ['-un'])) ?? false
    return { member: now, listed }
  },
  compare: (r, a) => a.member ? { status: 'met', detail: a.as || 'member' } : { status: 'missing', detail: a.listed ? 'added: holds from the next login (or: newgrp docker)' : 'not in the docker group' },
  create: async (r, ctx, a) => a?.listed ? { done: 'already added: log in again' } : change(ctx, `add ${run('id', ['-un'])} to the docker group`, [['usermod', '-aG', 'docker', run('id', ['-un'])]]),
  hint: () => 'log in again for the docker group to hold (or: newgrp docker), then boot again'
}

// A command's output, trimmed; null when it fails or is not there.
const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] }); return r.status === 0 ? String(r.stdout).trim() : null }
const exact = (want, actual, keys) => keys.every(k => want[k] === undefined || actual[k] === want[k])

export const os = {
  observe: () => ({ platform: process.platform, arch: process.arch }),
  compare: (r, a) => exact(r.want, a, ['platform', 'arch']) ? { status: 'met' } : { status: 'different', detail: a },
  hint: r => `this needs ${r.want.platform}/${r.want.arch}: on Windows, inside WSL2`
}

export const docker = {
  observe () {
    const out = run('docker', ['info', '--format', '{{json .}}'])
    if (!out) return null
    const info = JSON.parse(out)
    return {
      server: info.ServerVersion,
      os: info.OperatingSystem,
      rootless: (info.SecurityOptions || []).some(o => /rootless/.test(o)),
      desktop: /Docker Desktop/i.test(info.OperatingSystem || '')
    }
  },
  compare: (r, a) => {
    if (!a) return { status: 'missing' }
    const native = !a.rootless && !a.desktop
    return r.want.native && !native ? { status: 'different', detail: a } : { status: 'met', detail: { server: a.server } }
  },
  hint: (r, a) => !a ? 'Docker Engine is not running (or not installed): start it, and check with docker info'
    : 'Docker Desktop and rootless Docker are not enough: the managers on the host must reach the networks\' addresses; use Docker Engine, rootful (in WSL2, inside the distribution)'
}

// What images are built with: the bare package's runtime on this host
// (`bare --version` names the runtime; the build copies that binary).
export const bare = {
  observe () {
    const v = run('bare', ['--version'])
    return v ? { runtime: v.replace(/^v/, '') } : null
  },
  compare: (r, a) => !a ? { status: 'missing' } : a.runtime === r.want.runtime ? { status: 'met', detail: a } : { status: 'different', detail: a },
  // The bare package's version differs from its runtime's: the ones known.
  hint: (r, a) => `Bare's runtime ${r.want.runtime} is needed${a ? ` (found ${a.runtime})` : ''}: ${{ '1.36.0': 'npm i -g bare@1.36.2' }[r.want.runtime] || 'install the bare package with that runtime (npm i -g bare@<version>)'}`
}

export const subnet = {
  observe (r) {
    const ids = (run('docker', ['network', 'ls', '-q']) || '').split('\n').filter(Boolean)
    const held = []
    for (const id of ids) {
      const out = run('docker', ['network', 'inspect', id, '--format', '{{.Name}} {{range .IPAM.Config}}{{.Subnet}} {{end}}'])
      if (!out) continue
      const [name, ...subnets] = out.split(/\s+/).filter(Boolean)
      if (subnets.includes(r.want.cidr)) held.push(name)
    }
    const route = (run('ip', ['route']) || '').split('\n').find(l => l.startsWith(r.want.cidr.replace(/\/\d+$/, '')))
    return { heldBy: held, routed: Boolean(route) }
  },
  compare: (r, a) => {
    if (a.heldBy.length === 0 && !a.routed) return { status: 'met', detail: 'free' }
    if (r.want.network && a.heldBy.length === 1 && a.heldBy[0] === r.want.network) return { status: 'met', detail: `held by ${r.want.network}` }
    if (a.heldBy.length === 0 && a.routed) return { status: 'different', detail: 'routed by the host' }
    return { status: 'different', detail: { heldBy: a.heldBy } }
  },
  hint: (r, a) => `the subnet ${r.want.cidr} is taken (${a.heldBy.length ? `by ${a.heldBy.join(', ')}` : 'routed'}): free it, or choose another`
}

// A container on the network sends one datagram to the network's gateway
// (the host), where this process listens: the firewall lets it through.
export const udp = {
  async observe (r) {
    const net = r.want.network || 'bridge'
    const gw = run('docker', ['network', 'inspect', net, '--format', '{{range .IPAM.Config}}{{.Gateway}}{{end}}'])
    if (!gw) return null
    const sock = dgram.createSocket('udp4')
    await new Promise((resolve, reject) => sock.bind(0, gw, resolve).once('error', reject))
    const port = sock.address().port
    const got = new Promise(resolve => { sock.once('message', () => resolve(true)); setTimeout(() => resolve(false), 8000) })
    const image = r.want.image || 'debian:bookworm-slim'
    spawnSync('timeout', ['30', 'docker', 'run', '--rm', '--network', net, image, 'bash', '-c', `for i in 1 2 3; do echo ok > /dev/udp/${gw}/${port}; sleep 0.3; done`], { stdio: 'ignore' })
    const reached = await got
    sock.close()
    return { gateway: gw, reached }
  },
  compare: (r, a) => !a ? { status: 'missing', detail: `no network ${r.want.network || 'bridge'}` } : a.reached ? { status: 'met', detail: a } : { status: 'different', detail: a },
  hint: (r, a) => a ? `UDP from containers to ${a.gateway} is blocked: allow it in the firewall (ports 49737 to 49741 at least)` : 'Docker\'s network is not there'
}

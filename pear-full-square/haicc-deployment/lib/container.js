// A node's container: the node of the swarm's codebase running, from the
// node's config (node.json, written by its swarm's cold boot) and nothing
// else.
//   containerArgs(config, nodeDir, image)   docker run's arguments (pure)
//   ensureImage(runtimeDir)                 the image: a plain Debian base and Bare's
//                                           runtime (the setup's bare/, stripped), no code
//   startContainer(config, nodeDir, say)    started, then waited on until the node says
//                                           node-started: { ok, owner, dht, said }
//   stopContainer(config)                   stopped (SIGTERM, then removed)
// The code is the master's package repository (config.code, the swarm's
// codebase assembled in the master's packages/), mounted read-only at /app;
// the node's config at /node/node.json, read-only (its key, in readable text
// for now). Hardened as before: read-only root, every capability dropped, no
// new privileges, an unprivileged user, memory capped with no swap, no core
// dumps, its store on a tmpfs (in RAM).
import { existsSync, readFileSync, mkdtempSync, writeFileSync, copyFileSync, chmodSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { spawnSync } from 'bare-subprocess'
import crypto from 'bare-crypto'

export const docker = (...args) => {
  const r = spawnSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  return { ok: r.status === 0, out: String(r.stdout || '').trim(), err: String(r.stderr || '').trim() }
}

export function containerArgs (config, nodeDir, image) {
  const { swarm, name, role, container, network, ip, code, master, labels = {} } = config
  const memory = config.memory || '1g'
  return ['run', '-d', '--name', container, '--network', network, '--ip', ip,
    ...Object.entries(labels).flatMap(([k, v]) => ['--label', `${k}=${v}`]),
    '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '65534:65534',
    '--memory', memory, '--memory-swap', memory, '--ulimit', 'core=0',
    '--tmpfs', '/data:rw,noexec,nosuid,size=512m,mode=1777', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,mode=1777',
    '-v', `${code}:/app:ro`, '-v', `${join(nodeDir, 'node.json')}:/node/node.json:ro`,
    image, '/app/modules/pear-full-square/p2p-node/cli.js', role === 'master' ? 'master' : 'join',
    `--swarm=${swarm}`, `--name=${name}`, `--host=${ip}`, '--storage=/data/store', '--key-file=/node/node.json',
    ...(role === 'master' ? ['--code=/app'] : [`--bootstrap=${master.dht}`, `--master=${master.key}`])]
}

// The image, built here once per runtime: tagged by the runtime's hash.
export function ensureImage (runtimeDir) {
  const runtime = join(runtimeDir, 'bare')
  const hash = crypto.createHash('sha256').update(readFileSync(runtime)).digest('hex').slice(0, 12)
  const tag = `haicc-node:${hash}`
  if (docker('image', 'inspect', tag).ok) return { ok: true, tag, built: false, runtime }
  const dir = mkdtempSync(join(tmpdir(), 'haicc-image-'))
  try {
    copyFileSync(runtime, join(dir, 'bare'))
    chmodSync(join(dir, 'bare'), 0o755)
    writeFileSync(join(dir, 'Dockerfile'), '# A node: a plain base and Bare\'s runtime; its code is mounted.\nFROM debian:bookworm-slim\nCOPY bare /usr/local/bin/bare\nENTRYPOINT ["bare"]\n')
    const b = docker('build', '-q', '-t', tag, dir)
    return b.ok ? { ok: true, tag, built: true, runtime } : { ok: false, tag, said: b.err.split('\n').filter(Boolean).join(' | ') }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The node's log (its container's stdout, JSON lines), parsed.
export const nodeEvents = container => docker('logs', container).out.split('\n').map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

export async function startContainer (config, nodeDir, image, { timeoutMs = 180000 } = {}) {
  docker('rm', '-f', config.container)
  const r = docker(...containerArgs(config, nodeDir, image))
  if (!r.ok) return { ok: false, said: `not started: ${r.err.split('\n').filter(l => l && !/docker run --help/.test(l)).join(' | ')}` }
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const events = nodeEvents(config.container)
    const started = events.find(e => e.module === 'p2p-node' && e.kind === 'node-started')
    if (started) return { ok: true, owner: started.owner, dht: started.dht, ms: Date.now() - t0, said: `running: ${started.uri}, its key ${started.owner.slice(0, 12)}${started.dht ? `, the swarm's DHT at ${started.dht}` : ''}` }
    const failed = events.find(e => e.module === 'p2p-node' && (e.kind === 'failed' || e.kind === 'start-failed'))
    const state = docker('inspect', '-f', '{{.State.Status}}', config.container).out
    if (failed || state === 'exited' || state === 'dead') return { ok: false, said: `stopped: ${failed?.error || `its container ${state}`}` }
    await sleep(500)
  }
  return { ok: false, said: `no node-started within ${timeoutMs / 1000} s` }
}

export function stopContainer (config) {
  if (!docker('inspect', config.container).ok) return { ok: true, said: 'its container: not there' }
  docker('stop', '-t', '10', config.container)
  const r = docker('rm', '-f', config.container)
  return r.ok ? { ok: true, said: `its container ${config.container}: stopped, removed` } : { ok: false, said: r.err }
}

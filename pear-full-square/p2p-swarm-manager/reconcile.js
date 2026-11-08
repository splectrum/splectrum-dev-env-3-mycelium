// haicc-reconcile's providers for what the swarm manager knows (the
// substrate: the swarm it runs on this host, and its nodes).
//   swarm   { swarm, folder, nodes, vault, code, subnet?, auxSubnet? }
//           described and running (its master up); made by genesis, or
//           started again as described; removed: stopped
//   node    { swarm: <swarm folder>, name }      a named node, running
//   swarm-deployment { swarm: <swarm folder>, deployment }
//           the swarm's part of a deployment, as the swarm has it (observed
//           through this manager's shadow; set by request: the swarm is its
//           authority)
//   swarm-watcher { swarm: <swarm folder>, auto }
//           the manager following the deployment, a process on top (auto:
//           making the substrate match); removed: stopped
//   A node held (asked to shut down, not released: shutdown.js) is left
//   alone: met as held, never an extra, counted in a selection; the
//   swarm-deployment requirement releases a held node its deployment names.
//   nodes   { swarm: <swarm folder>, atLeast, prefix, type?, config? }
//           selected: at least n running nodes named <prefix><i>, the
//           master not counted (types and configurations: later)
// Ownership: a swarm made through haicc is marked with its owner in its
// folder; its nodes are that owner's. Extras: running nodes of a declared
// swarm that no requirement names (strict stops them, if ours).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { genesis, joinNode, start, stop, stopNode, restart, describe, setDeployment } from './index.js'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'
import { spawn } from 'node:child_process'
import { openSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { nodeState } from '../p2p-node-manager/index.js'
import { heldNodes, release } from './shutdown.js'

const MARK = 'haicc-owner'
const ownerOf = folder => existsSync(join(folder, MARK)) ? readFileSync(join(folder, MARK), 'utf8').trim() : null
const running = async n => (await nodeState(n.folder))?.status === 'running'

const networkExists = name => { try { execFileSync('docker', ['network', 'inspect', name], { stdio: 'ignore' }); return true } catch { return false } }

const swarm = {
  async observe (r) {
    const s = await describe({ folder: r.want.folder })
    // Not ours to describe, but its networks are there: a swarm of that
    // name runs from elsewhere on this host (another project). A conflict:
    // reported, never touched.
    if (!s) return networkExists(`p2p-${r.want.swarm}`) ? { conflict: true, swarm: r.want.swarm, owner: null } : null
    return { swarm: s.swarm, nodes: s.nodes.map(n => n.name), running: await running(s.nodes[0]), owner: ownerOf(r.want.folder) }
  },
  compare: (r, a) => !a ? { status: 'missing' } : a.conflict ? { status: 'different', detail: 'another swarm of this name runs here' } : a.running ? { status: 'met', detail: { nodes: a.nodes } } : { status: 'different', detail: 'stopped' },
  async create (r, ctx, a) {
    if (!a) {
      // Marked first: a genesis that fails leaves a swarm still ours to clean up.
      mkdirSync(r.want.folder, { recursive: true })
      writeFileSync(join(r.want.folder, MARK), ctx.owner + '\n')
      const s = await genesis(r.want)
      return { genesis: s.swarm, image: s.image }
    }
    const s = await start({ folder: r.want.folder })
    return { started: s.swarm }
  },
  owned: (a, ctx) => a.owner === ctx.owner,
  async remove (r) { await stop({ folder: r.want.folder }) },
  hint: (r, a) => a?.conflict ? `a swarm named ${r.want.swarm} runs on this host from elsewhere (another project?): stop it first` : 'this swarm was not made by this owner: its own manager stops or starts it'
}

const nodeOf = async (folder, name) => {
  const s = await describe({ folder })
  const n = s?.nodes.find(x => x.name === name)
  return n ? { swarm: folder, name, running: await running(n), held: (await heldNodes(folder)).has(name), owner: ownerOf(folder) } : null
}

const node = {
  observe: r => nodeOf(r.want.swarm, r.want.name),
  compare: (r, a) => !a ? { status: 'missing' } : a.held ? { status: 'met', detail: 'held (shut down)' } : a.running ? { status: 'met' } : { status: 'different', detail: 'stopped' },
  async create (r, ctx, a) {
    if (!a) return joinNode({ folder: r.want.swarm, node: r.want.name })
    await restart({ folder: r.want.swarm, node: r.want.name })
    return { restarted: r.want.name }
  },
  owned: (a, ctx) => a.owner === ctx.owner,
  // The substrate's own work (strict: an extra stopped): no shutdown asked.
  async remove (r, ctx, a) { await stopNode({ folder: a.swarm, node: a.name, hold: false }) },
  hint: () => 'this node was not made by this owner',
  async extras (all) {
    // The swarms named by node and nodes requirements; a node named, or
    // covered by a selection's prefix, is not an extra.
    const reqs = all.filter(r => r.kind === 'node' || r.kind === 'nodes')
    const out = []
    const named = new Set(reqs.filter(r => r.kind === 'node').map(r => `${r.want.swarm}|${r.want.name}`))
    const selected = reqs.filter(r => r.kind === 'nodes').map(r => [r.want.swarm, r.want.prefix ?? 'node-'])
    for (const folder of new Set(reqs.map(r => r.want.swarm))) {
      const s = await describe({ folder })
      const held = await heldNodes(folder)
      for (const n of s?.nodes || []) {
        if (n.role === 'master' || named.has(`${folder}|${n.name}`) || held.has(n.name)) continue
        if (selected.some(([f, prefix]) => f === folder && n.name.startsWith(prefix))) continue
        if (await running(n)) out.push({ name: `${s.swarm}-${n.name}`, actual: { swarm: folder, name: n.name, running: true, owner: ownerOf(folder) } })
      }
    }
    return out
  }
}

const nodes = {
  async observe (r) {
    const s = await describe({ folder: r.want.swarm })
    if (!s) return null
    const prefix = r.want.prefix ?? 'node-'
    const mine = s.nodes.filter(n => n.role !== 'master' && n.name.startsWith(prefix))
    const up = []
    for (const n of mine) if (await running(n)) up.push(n.name)
    const held = [...(await heldNodes(r.want.swarm)).keys()].filter(n => mine.some(m => m.name === n) && !up.includes(n))
    return { swarm: r.want.swarm, prefix, known: mine.map(n => n.name), running: up, held, owner: ownerOf(r.want.swarm) }
  },
  compare: (r, a) => a && a.running.length + a.held.length >= r.want.atLeast ? { status: 'met', detail: { running: a.running, held: a.held } } : { status: 'missing', detail: a ? { running: a.running, held: a.held } : null },
  async create (r, ctx, a) {
    const made = []
    let up = a ? a.running.length + a.held.length : 0
    for (let i = 1; up < r.want.atLeast; i++) {
      const name = `${a?.prefix ?? r.want.prefix ?? 'node-'}${i}`
      if (a?.running.includes(name) || a?.held.includes(name)) continue
      if (a?.known.includes(name)) await restart({ folder: r.want.swarm, node: name })
      else await joinNode({ folder: r.want.swarm, node: name })
      made.push(name)
      up++
    }
    return { made }
  },
  owned: (a, ctx) => a.owner === ctx.owner
}

const shadowOf = async folder => {
  if (!existsSync(join(folder, 'topics', 'deployment'))) return null
  const t = await openTopic({ storage: folderStorage(join(folder, 'topics', 'deployment')) })
  return t.fold((at, r) => r.value.kind === 'deployment' ? { commit: r.value.commit, deployment: r.value.deployment } : at, null)
}

// The nodes a deployment names that are held: to release, for it to be met.
const heldNamed = async (folder, deployment) => { const h = await heldNodes(folder); return (deployment?.nodes || []).filter(n => n.name && h.has(n.name)).map(n => n.name) }

const swarmDeployment = {
  async observe (r) {
    if (!(await describe({ folder: r.want.swarm }))) return null
    const seen = await shadowOf(r.want.swarm)
    return { ...(seen || { commit: null, deployment: null }), held: await heldNamed(r.want.swarm, r.want.deployment), owner: ownerOf(r.want.swarm) }
  },
  compare: (r, a) => !a || !a.deployment ? { status: 'missing' }
    : !isDeepStrictEqual(a.deployment, r.want.deployment) ? { status: 'different', detail: { commit: a.commit } }
      : a.held.length ? { status: 'different', detail: { commit: a.commit, held: a.held } }
        : { status: 'met', detail: { commit: a.commit } },
  async create (r, ctx, a) {
    // Set as the swarm has it; then the nodes it names released (the
    // watcher, in auto mode, brings them back).
    const out = a?.deployment && isDeepStrictEqual(a.deployment, r.want.deployment) ? { commit: a.commit } : await setDeployment({ folder: r.want.swarm, deployment: r.want.deployment })
    for (const n of await heldNamed(r.want.swarm, r.want.deployment)) await release({ folder: r.want.swarm, node: n, by: 'reconcile' })
    return out
  },
  owned: (a, ctx) => a.owner === ctx.owner
}

const cli = join(dirname(fileURLToPath(import.meta.url)), 'cli.js')
const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const watcher = {
  observe (r) {
    const f = join(r.want.swarm, 'watch.pid')
    const pid = existsSync(f) ? Number(readFileSync(f, 'utf8')) : null
    return pid && alive(pid) ? { pid, owner: ownerOf(r.want.swarm) } : null
  },
  compare: (r, a) => a ? { status: 'met', detail: { pid: a.pid } } : { status: 'missing' },
  async create (r) {
    const out = openSync(join(r.want.swarm, 'watch.out'), 'a')
    const child = spawn(process.execPath, [cli, 'watch', `--folder=${r.want.swarm}`, `--auto=${r.want.auto ? 'true' : 'false'}`], { detached: true, stdio: ['ignore', out, out] })
    child.unref()
    for (let i = 0; i < 120; i++) {
      if (existsSync(join(r.want.swarm, 'watch.pid'))) return { pid: child.pid, auto: Boolean(r.want.auto) }
      if (!alive(child.pid)) throw new Error('the watcher stopped at its start (watch.out)')
      await sleep(250)
    }
    throw new Error('the watcher did not start within 30 s')
  },
  owned: (a, ctx) => a.owner === ctx.owner,
  async remove (r, ctx, a) {
    try { process.kill(a.pid, 'SIGTERM') } catch {}
    for (let i = 0; i < 80 && alive(a.pid); i++) await sleep(250)
    rmSync(join(r.want.swarm, 'watch.pid'), { force: true })
  }
}

export const providers = { swarm, node, nodes, 'swarm-deployment': swarmDeployment, 'swarm-watcher': watcher }

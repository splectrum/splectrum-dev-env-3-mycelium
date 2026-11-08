// A node's shutdown, with its prerequisites: before a node is stopped, every
// party holding on to it lets go (like programs closing before a computer
// shuts down). Today one party: the swarm manager's watcher, which in auto
// mode would bring a stopped node back; later, each application the node
// takes part in.
//   await requestShutdown({ folder, node, by })   asked, and returns once every
//                                                 running party has let go
//   await release({ folder, node, by })           the node may be kept again
//   await heldNodes(folder)                       Map: node -> its request
//   await letGo(folder, party, upTo)              a party: every request up to
//                                                 offset upTo, let go
// All of it as records: <swarm folder>/topics/shutdown (requests and
// releases), topics/shutdown-<party> (what each party let go, one producer
// each).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }
const requests = folder => openTopic({ storage: folderStorage(join(folder, 'topics', 'shutdown')) })
const partyTopic = (folder, party) => openTopic({ storage: folderStorage(join(folder, 'topics', `shutdown-${party}`)) })

// The parties holding on to a swarm's nodes now: the watcher, if it runs.
export function partiesOf (folder) {
  const f = join(folder, 'watch.pid')
  const pid = existsSync(f) ? Number(readFileSync(f, 'utf8')) : null
  return pid && alive(pid) ? ['swarm-watcher'] : []
}

// The nodes held: asked to shut down and not released since.
export async function heldNodes (folder) {
  if (!existsSync(join(folder, 'topics', 'shutdown'))) return new Map()
  const t = await requests(folder)
  return t.fold((held, r) => {
    if (r.value.kind === 'shutdown-requested') held.set(r.value.node, { request: r.offset, by: r.value.by, time: r.value.time })
    else if (r.value.kind === 'released') held.delete(r.value.node)
    return held
  }, new Map())
}

export async function endOffset (folder) {
  if (!existsSync(join(folder, 'topics', 'shutdown'))) return 0
  return (await requests(folder)).endOffset()
}

// What a party has let go: the offsets of the requests.
async function letGoBy (folder, party) {
  if (!existsSync(join(folder, 'topics', `shutdown-${party}`))) return new Set()
  return (await partyTopic(folder, party)).fold((s, r) => s.add(r.value.request), new Set())
}

export async function requestShutdown ({ folder, node, by = 'swarm-manager', timeout = 30000 }) {
  const t0 = Date.now()
  const parties = partiesOf(folder)
  const request = await (await requests(folder)).produce({ value: { kind: 'shutdown-requested', node, by, parties, time: t0 } })
  for (const party of parties) {
    while (!(await letGoBy(folder, party)).has(request)) {
      if (Date.now() - t0 > timeout) throw new Error(`${party} did not let go of ${node} within ${timeout} ms (request ${request}): not stopped`)
      await sleep(200)
    }
  }
  return { node, request, parties, ms: Date.now() - t0 }
}

export async function release ({ folder, node, by = 'swarm-manager' }) {
  if (!(await heldNodes(folder)).has(node)) return null
  return (await requests(folder)).produce({ value: { kind: 'released', node, by, time: Date.now() } })
}

// A party: every request before offset upTo it has not let go yet, let go
// (it calls this after a round that began once those requests were there).
export async function letGo (folder, party, upTo) {
  if (!upTo) return []
  const done = await letGoBy(folder, party)
  const out = []
  // Only requests still standing (a node released since needs nothing).
  for (const [node, h] of await heldNodes(folder)) {
    if (h.request >= upTo || done.has(h.request)) continue
    await (await partyTopic(folder, party)).produce({ value: { kind: 'let-go', node, request: h.request, party, time: Date.now() } })
    out.push(node)
  }
  return out
}

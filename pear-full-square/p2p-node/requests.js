// Requests to a node's repository, in code: a request comes as a bundle on
// a channel ('p2p-request'); intake commits it into the repository's
// pending/default; the node executes it with layer/request's flow and
// responds on main; the requester reads the response from a replica.
//   const service = requests({ repo, status, observer })
//   openChannel(stream, { name: 'p2p-request', onrequest: service.handler(peer) })
//   await askRequest(channel, { name, bundle })   from the requester's side
//
// A request bundle has a branch `request` whose tree is the request folder
// (request.md, and any data). Intake takes it once, under its name (a URI
// segment, new in pending/), recording the sender's key; senders are not
// yet admitted or refused (open: admitting writers). Requests run one at a
// time, in the order they came.
//
// Kinds: `Status: node`, answered with the node's status (status());
// `Deployment: set`, on the master only (`deployment`): the request's
// `deployment.json`, checked at this boundary, committed to the swarm's
// deployment repository.

import { readBundle, writeBundle, writer, openRepo } from '../mycelium-git/index.js'
import { executeRequests } from '../mycelium-layer/index.js'
import { validateName } from '../mycelium-uri/index.js'
import { checkDeployment } from './deployment.js'
import process from 'bare-process'

const author = { name: 'p2p-node', email: 'p2p-node@localhost' }

export function requests ({ repo, status, deployment = null, observer = null }) {
  const emit = (kind, facts) => observer && observer({ module: 'p2p-node', kind, time: Date.now(), repository: repo.name, ...facts })
  let queue = Promise.resolve()
  const senders = new Map() // request name -> its sender, as taken in

  async function intake ({ name, bytes, sender }) {
    const backend = repo.backend
    const branches = Object.fromEntries(await backend.listBranches())
    if (!branches['pending/default']) throw new Error('no pending/default to take requests')
    const { branches: given } = await readBundle(backend, bytes)
    if (!given.request) throw new Error('the bundle has no branch request')
    const files = []
    const walk = async (oid, path) => {
      for (const e of await backend.readTree(oid)) {
        if (e.type === 'tree') await walk(e.oid, `${path}/${e.name}`)
        else files.push([`${path}/${e.name}`, await backend.readBlob(e.oid)])
      }
    }
    await walk((await backend.readCommit(given.request)).tree, `/pending/${name}`)
    if (!files.some(([p]) => p === `/pending/${name}/request.md`)) throw new Error('the request has no request.md')
    const w = writer(backend)
    const c = await w.change('pending/default')
    for (const [path, content] of files) {
      if ((await existing(backend, path))) throw new Error(`request exists: ${name}`)
      await c.put(path, content)
    }
    const commit = await c.commit(`Request ${name}\n\nTaken in from ${sender}.\n`, { author })
    senders.set(name, sender)
    emit('request-taken', { name, sender, files: files.length, bytes: bytes.length, commit })
    return commit
  }

  const existing = async (backend, path) => (await openRepo(backend).select(`/pending/default${path}`)).length > 0

  async function execute () {
    const executed = await executeRequests({
      backend: repo.backend,
      capability: 'capability/default',
      author,
      environment: { runtime: typeof Bare !== 'undefined' ? `bare ${Bare.version}` : `node ${process.version}` },
      plan: pending => pending.map(({ name, text }) => {
        const m = text.match(/^Status:[ \t]*node[ \t]*$/m)
        const d = text.match(/^Deployment:[ \t]*set[ \t]*$/m)
        return { name, kind: m ? 'status' : d ? 'deployment' : null, line: (m || d)?.[0] ?? null }
      }),
      handle: async request => {
        if (request.kind === 'deployment') {
          if (!deployment) return { outcome: 'not executed: this node does not keep the deployment (the master does).' }
          let value
          try {
            const raw = await openRepo(repo.backend).read(`/pending/default/pending/${request.name}/deployment.json`)
            value = checkDeployment(JSON.parse(raw.toString()), deployment.swarm)
          } catch (err) { return { outcome: `not executed: ${err.message}.` } }
          const commit = await deployment.set(value, senders.get(request.name) || 'unknown')
          return { outcome: 'Deployment set.', body: '```json\n' + JSON.stringify({ commit, nodes: value.nodes }, null, 2) + '\n```\n' }
        }
        if (!request.kind) return { outcome: "not executed: the request has no 'Status: node' or 'Deployment: set' line." }
        const s = await status()
        return { outcome: 'Status given.', body: '```json\n' + JSON.stringify(s, null, 2) + '\n```\n' }
      }
    })
    const main = Object.fromEntries(await repo.backend.listBranches()).main
    emit('requests-executed', { executed, main })
    return { executed, main }
  }

  return {
    // The boundary: a request's name, from a peer, is validated here, once.
    handler (sender) {
      return body => {
        if (body.op !== 'request') throw new Error(`unknown op: ${body.op}`)
        const name = validateName(body.name, 'request name')
        const run = queue.then(async () => {
          const taken = await intake({ name, bytes: Buffer.from(body.bundle, 'base64'), sender })
          return { taken, ...(await execute()) }
        })
        queue = run.catch(() => {})
        return run
      }
    }
  }
}

// Send a request bundle to a node's repository on a channel; resolves once
// it is taken in and executed: { taken, executed, main }.
export function askRequest (channel, { name, bundle }) {
  return channel.request({ op: 'request', name, bundle: Buffer.from(bundle).toString('base64') })
}

// A request, written in the requester's own repository (any backend) as a
// branch `request` holding the request folder, and bundled to be sent.
//   await requestBundle(backend, { 'request.md': '# Request: ...\n\nStatus: node\n' })
export async function requestBundle (backend, files) {
  const entries = []
  for (const [name, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    entries.push({ name, mode: '100644', type: 'blob', oid: await backend.writeBlob(Buffer.from(content)) })
  }
  const tree = await backend.writeTree(entries)
  const commit = await backend.writeCommit({ tree, parents: [], message: 'A request\n', author, time: new Date().toISOString() })
  return writeBundle(backend, { request: commit })
}

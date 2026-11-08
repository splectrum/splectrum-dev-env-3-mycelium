// splectral-p2p-observer — a privileged application on a node, part of
// Splectral's p2p adapter (notes/splectral.md). Granted by the node's
// manager; it answers only that manager.
//   attachObserver({ node, input, log })
//     node    the running node (p2p-node's startNode)
//     input   a stream of actions, one JSON line each: { id, action, with }
//             (the management channel's end in the node's process)
//     log     where results go: the node's log, which its manager produces
//             into the node's topic
//
// It sees inside the node (the node's events already reach the log; its
// state on demand) and carries out named actions only, each declared here:
//   state                    the node's status and metrics
//   write { name, text }     a note committed on the node's repository's
//                            main (`/notes/<name>.md`): activity that
//                            replicas see
// Never a secret: the node's status and metrics hold none, and the
// observer has no access to the store's keys.

import { writer } from '../mycelium-git/index.js'

const MODULE = 'splectral-p2p-observer'
const author = { name: 'splectral-p2p-observer', email: 'observer@localhost' }

export const actions = {
  state: async ({ node }) => ({ status: node.status(), metrics: node.metrics() }),
  write: async ({ node }, { name, text }) => {
    const repo = node.repos.node
    const c = await writer(repo.backend).change('main')
    await c.put(`/notes/${name}.md`, String(text))
    const commit = await c.commit(`A note: ${name}`, { author })
    return { uri: `${node.uri}/node`, path: `/main/notes/${name}.md`, commit }
  }
}

export function attachObserver ({ node, input, log }) {
  const emit = (kind, facts) => log({ module: MODULE, kind, time: Date.now(), ...facts })
  let rest = ''
  let queue = Promise.resolve()
  const handle = async line => {
    let msg
    try { msg = JSON.parse(line) } catch { return emit('action-refused', { why: 'not JSON' }) }
    if (msg.shadow) return // the node's own (its manager's state), not an action
    const run = actions[msg.action]
    if (!run) return emit('action-result', { id: msg.id, action: msg.action, ok: false, error: `unknown action: ${msg.action}` })
    try {
      const result = await run({ node }, msg.with || {})
      emit('action-result', { id: msg.id, action: msg.action, ok: true, result })
    } catch (err) {
      emit('action-result', { id: msg.id, action: msg.action, ok: false, error: err.message })
    }
  }
  const ondata = chunk => {
    rest += chunk.toString()
    let i
    while ((i = rest.indexOf('\n')) !== -1) {
      const line = rest.slice(0, i).trim()
      rest = rest.slice(i + 1)
      if (line) queue = queue.then(() => handle(line))
    }
  }
  input.on('data', ondata)
  if (input.resume) input.resume()
  emit('observer-attached', { uri: node.uri, actions: Object.keys(actions) })
  return { detach: () => input.removeListener('data', ondata), settled: () => queue }
}

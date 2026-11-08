// splectral-contract — the extension contract, versioned
// (notes/splectral.md). What an extension declares, and the abstract world
// every application works in. Shared by server and browser; no p2p.

export const contractVersion = '0.2.0'
// Minor versions add to the world, never change it: an extension written
// for 0.1 works on 0.2.

// The abstract world: entities, events and actions, in data names.
export const world = {
  entities: ['host', 'node', 'resource', 'link'],
  events: {
    nodeStarting: 'a node is starting { uri, host, controlled }',
    joined: 'a node is running { uri, host, key, controlled }',
    gone: 'a node has stopped { uri, exitCode }',
    absent: 'a node has not been heard from within its lease { uri, since }',
    present: 'an absent node is heard from again { uri }',
    left: 'a node has left, gracefully { uri }',
    resource: 'a resource exists { uri, node, type }',
    connected: 'a link opened { from, toKey }',
    disconnected: 'a link closed { from, toKey, bytes }',
    requestSent: 'a request went out { from, to, name }',
    requestAnswered: 'a request was answered { uri, name }',
    changed: 'a resource changed { uri, path }',
    actionResult: 'an action came back { id, action, ok }',
    say: 'a message for the people watching { text }'
  },
  // Action ids are names (rules.md): what scenarios and pages ask for.
  actions: ['send-request', 'start-node', 'stop-node', 'pause-node', 'resume-node', 'run-scenario', 'invite', 'start-node-from-invitation', 'state', 'write']
}

const KINDS = ['source', 'mapper', 'page', 'scenario', 'action']
const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

// The boundary for extensions: a manifest (splectral.json) is checked once,
// when the server finds it.
export function checkManifest (m) {
  if (!m || typeof m !== 'object') throw new Error('a manifest is an object')
  if (!ID.test(m.name || '')) throw new Error(`not an extension name: ${m.name}`)
  const minor = String(m.contract || '').match(/^0\.(\d+)(\.|$)/)
  if (!minor || Number(minor[1]) > Number(contractVersion.split('.')[1])) throw new Error(`${m.name}: contract ${m.contract} is not met by ${contractVersion}`)
  for (const p of m.provides || []) {
    if (!KINDS.includes(p.kind)) throw new Error(`${m.name}: unknown kind ${p.kind}`)
    if (!ID.test(p.id || '')) throw new Error(`${m.name}: not an id: ${p.id}`)
    if (p.kind === 'page' && !Array.isArray(p.needs)) throw new Error(`${m.name}/${p.id}: a page declares what it needs`)
    if (['source', 'mapper', 'page', 'action'].includes(p.kind) && !p.module) throw new Error(`${m.name}/${p.id}: no module`)
    if (p.kind === 'scenario' && !p.file) throw new Error(`${m.name}/${p.id}: no file`)
  }
  return m
}

// Topics a page may need: 'world' (the whole model), 'node' (one per node:
// the page is parameterised by a node's URI).
export const topics = ['world', 'node']

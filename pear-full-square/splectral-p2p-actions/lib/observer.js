// An action for a node's observer: a record produced into the node's
// action topic, which its node manager follows and passes over the
// management channel (splectral-p2p-observer). Only a node a node manager
// runs has one.
import { join } from 'bare-path'
import { openTopic, folderStorage } from '../../mycelium-topic/index.js'
import { findNode } from './hosts.js'

export async function toObserver (config, uri, action, args = {}) {
  const { folder, managed } = await findNode(config, uri)
  if (!managed) throw new Error(`${uri} has no observer here (a node HAICC runs: its container has no management channel)`)
  const t = await openTopic({ storage: folderStorage(join(folder, 'topics', 'actions')) })
  const offset = await t.produce({ value: { action, with: args } })
  return { node: uri, action, correlation: String(offset) }
}

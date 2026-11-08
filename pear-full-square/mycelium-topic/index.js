// mycelium-topic — topics of Kafka records, single partition, on any
// storage (notes/topics.md). Mycelium's Kafka layer, starting basic.

export { openTopic, committedOffsets } from './lib/topic.js'
export { folderStorage } from './lib/folder.js'
export { parseRecords, extensionOf } from './lib/format.js'

// write { node, name, text }: a note committed on the node's repository.
import { toObserver } from './lib/observer.js'
export default ({ node, name, text }, ctx) => toObserver(ctx.config, node, 'write', { name, text })

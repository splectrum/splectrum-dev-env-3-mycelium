// state { node }: the node's status and metrics, from its observer.
import { toObserver } from './lib/observer.js'
export default ({ node }, ctx) => toObserver(ctx.config, node, 'state')

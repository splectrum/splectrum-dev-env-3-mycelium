// mrepo-base-service: its documented methods, a directory each (README.md beside each).
//   external/   the service protocol's actions: initialise, start, stop, shutdown
//   internal/   state.js: the service state, the protocol's config
export { initialise } from './external/initialise/index.js'
export { start } from './external/start/index.js'
export { stop } from './external/stop/index.js'
export { shutdown } from './external/shutdown/index.js'
export { CONFIG, STATE, stateOf, transition } from './internal/state.js'

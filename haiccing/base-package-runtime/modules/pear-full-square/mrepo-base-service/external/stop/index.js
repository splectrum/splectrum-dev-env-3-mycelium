// stop: service stop /, the service state moved to initialised (README.md beside it).
import { transition } from '../../internal/state.js'

export const stop = exec => transition(exec, 'stop', 'initialised', 'stopped')

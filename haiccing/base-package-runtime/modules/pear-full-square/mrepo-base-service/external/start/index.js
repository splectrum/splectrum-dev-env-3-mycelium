// start: service start /, the service state moved to started (README.md beside it).
import { transition } from '../../internal/state.js'

export const start = exec => transition(exec, 'start', 'started', 'started')

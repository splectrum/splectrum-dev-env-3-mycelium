// start: service start /, the service state moved to started (README.md beside it).
import { moveTo } from '../../internal/state.js'

export const start = exec => moveTo(exec, 'started', 'started')

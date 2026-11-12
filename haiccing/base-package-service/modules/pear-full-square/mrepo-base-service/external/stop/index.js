// stop: service stop /, the service state moved to initialised (README.md beside it).
import { moveTo } from '../../internal/state.js'

export const stop = exec => moveTo(exec, 'initialised')

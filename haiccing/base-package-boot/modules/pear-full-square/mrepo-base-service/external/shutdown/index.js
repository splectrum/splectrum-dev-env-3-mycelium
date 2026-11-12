// shutdown: service shutdown /, the service state moved to booted (README.md beside it).
import { moveTo } from '../../internal/state.js'

export const shutdown = exec => moveTo(exec, 'booted')

// initialise: service initialise /, the service state moved to initialised (README.md beside it).
import { moveTo } from '../../internal/state.js'

export const initialise = exec => moveTo(exec, 'initialised')

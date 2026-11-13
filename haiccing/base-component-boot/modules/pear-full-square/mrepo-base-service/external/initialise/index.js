// initialise: service initialise /, the service state moved to initialised (README.md beside it).
import { transition } from '../../internal/state.js'

export const initialise = exec => transition(exec, 'initialise', 'initialised', 'initialised')

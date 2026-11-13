// The service state, in the runtime layer (/runtime/service.json: { state }),
// read and moved by the service actions; and the protocol's config: each
// action at /, in the states that allow it (the state machine: booted ->
// initialised -> started, and back).
import * as json from 'mycelium-value-json'

export const STATE = '/runtime/service.json'

export async function stateOf (exec) {
  return JSON.parse((await exec.read(STATE)).toString())
}

// The state moved: the answer says what was done (done: initialised,
// started, stopped, shut down) and the state the service is in now.
export async function moveTo (exec, state, done) {
  exec.put(STATE, json.encode({ ...await stateOf(exec), state }))
  return { service: done, state }
}

const at = states => ({ uris: ['/'], states })
export const CONFIG = {
  description: 'The service of the mrepo\'s external API, moved between its states: booted, initialised, started.',
  actions: {
    initialise: { ...at(['booted']), description: 'From booted to initialised: the mrepo made ready.' },
    start: { ...at(['initialised']), description: 'From initialised to started: the external API open.' },
    stop: { ...at(['started']), description: 'From started back to initialised: the external API closed.' },
    shutdown: { ...at(['initialised']), description: 'From initialised back to booted.' }
  }
}

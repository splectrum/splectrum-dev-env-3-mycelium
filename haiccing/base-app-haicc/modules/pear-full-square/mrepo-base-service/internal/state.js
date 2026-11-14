// The service state, in the runtime layer (/runtime/service.json: { state }),
// read and moved by the service actions, each firing its transition's
// hooks first; and the protocol's config: each action at /, in the states
// that allow it (the state machine: booted -> initialised -> started, and
// back).
import * as json from 'mycelium-value-json'
import { hooks } from 'mrepo-base-request'

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

// A transition made: its hooks run first (the commands the mrepo's defining
// package dropped into /runtime/hooks/<transition>/, in name order), each in
// this same execution, as the mrepo's own; then the state moved. A hook that
// fails fails the transition: nothing of it stays.
export async function transition (exec, name, state, done) {
  for (const h of await hooks(exec, name)) {
    await exec.run(h.command, { own: true })
    exec.log?.('info', 'hook', { transition: name, hook: h.name, command: h.command.join(' ') })
  }
  return moveTo(exec, state, done)
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

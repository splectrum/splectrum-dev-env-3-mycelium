// The protocol protocol's config: activate and deactivate, at the mrepo
// itself, their argument the protocol's name. And where the active set is:
// the protocols layer, one file a protocol, holding its config.
export const activeAt = name => `/protocols/${name}.json`

const one = { uris: ['/'], args: ['protocol'] }
export const CONFIG = {
  description: 'The protocols an mrepo offers to the outside: activated and deactivated.',
  actions: {
    activate: { ...one, description: 'A loaded protocol made active: requests from outside are accepted for it. Its config written into the protocols layer.' },
    deactivate: { ...one, description: 'An active protocol made inactive again: its file removed from the protocols layer.' }
  }
}

# test/

The tests of mrepo-base-request, a section per file, each test by its name.

## `boxes.test.js`

- post on p2p-git and on native: a record committed into the inbox layer; the folder's new files committed; nothing removed
- the setting: the p2p host by default; a repository on native git by mrepo.json

## `check.test.js`

- a command interpreted: its parts, the default action, the URI
- missing: what an action's config asks for and the request does not give
- matches: a URI against a config's pattern
- check: canonical, loaded, offered there
- check: nothing is active by default; a request from outside only for an active protocol
- check: the service's own actions, each in its state
- check at the inbox: neither the activation nor the state (the queue may change them first)
- hooks: the commands of a transition, files in its folder, in name order
- a record: topic, key, timestamp, headers (empty), value; the onion; a form completed
- check: an internal request, the mrepo's own: not asked whether active; an action that names its states still by them

# test/

The tests of mrepo-base-request, a section per file, each test by its name.

## `boxes.test.js`

- post on p2p-git and on native: a record committed into the inbox layer; the folder's new files committed; nothing removed
- the setting: the p2p host by default; a repository on native git by mrepo.json

## `check.test.js`

- check: not misdelivered, canonical, offered, and now
- check: the service state gates the API
- check at the inbox: not the state (the queue may change it first)
- a command interpreted: its parts, the default action, the URI
- a record: topic, key, timestamp, headers (empty), value; the onion; a form completed

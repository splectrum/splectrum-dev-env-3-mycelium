# test/

mrepo-base-request's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/mrepo-base-request`.

## `boxes.test.js`

- post on p2p-git and on native: a record committed into the inbox layer; the folder's new files committed; nothing removed
- the setting: the p2p host by default; a repository on native git by mrepo.json

## `check.test.js`

- check: not misdelivered, canonical, offered, and now
- check: the service state gates the API
- check at the inbox: not the state (the queue may change it first)
- a record: topic, key, timestamp, headers (empty), value; the onion; a form completed

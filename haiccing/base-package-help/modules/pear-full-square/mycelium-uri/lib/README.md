# lib/

The parts of mycelium-uri, a file each, imported by its `index.js`.

| file | |
|---|---|
| `names.js` | Names, by the rules (rules.md: URIs, Data names). |
| `relative.js` | A relative URI, as it is written in a request: no leading slash, `.` the position itself; and the way to and from a position and the slash-led paths. |
| `uri.js` | Our URIs: absolute, '/'-separated segments, no scheme, query or fragment. |

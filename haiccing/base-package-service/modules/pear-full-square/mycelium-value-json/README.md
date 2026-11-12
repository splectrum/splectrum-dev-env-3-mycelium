# mycelium-value-json

An encoding as a handler: one value to bytes and back, as one line of JSON.

| | |
|---|---|
| [test/](test/) | its tests, what each checks |

## Usage

```js
import * as json from 'mycelium-value-json'
json.extension            // 'json'
json.encode({ a: 1 })     // <Buffer '{"a":1}\n'>
json.decode(bytes)        // { a: 1 }
```

## Tests

- `npm test`: the unit tests

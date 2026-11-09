# mycelium-value-json

An encoding, as a handler (`docs/design/values.md`): one value to bytes and
back, as JSON, one line, ending with a newline.

```js
import * as json from 'mycelium-value-json'
json.extension            // 'json'
json.encode({ a: 1 })     // <Buffer '{"a":1}\n'>
json.decode(bytes)        // { a: 1 }
```

## Tests

- `npm test`: the unit tests

# mycelium-container-document

A storage container (`docs/design/values.md`): a folder of documents, one
value per file, written atomically (a temporary name, then renamed), in the
encoding it is given (a handler such as `mycelium-value-json`). Writers may
work in parallel, each with its own names.

```js
import { documents } from 'mycelium-container-document'
import * as json from 'mycelium-value-json'
const box = documents('/some/folder', json)
const name = box.add({ a: 1 })   // a new, time-ordered name
box.write('config', { b: 2 })    // a name of the caller's
box.list()                       // names, in order
box.read(name); box.remove(name)
```

## The folders

| | |
|---|---|
| [test/](test/) | its tests, what each checks |

## Tests

- `npm test`: the unit tests

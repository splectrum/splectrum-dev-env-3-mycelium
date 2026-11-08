# p2p-channel

Messages and requests on a p2p connection, not stored: what passes on a
channel is gone once delivered. One of the p2p series.

```js
import { openChannel } from 'p2p-channel'
const ch = openChannel(stream, { name, onmessage, onrequest, observer, peer })
await ch.opened                  // once the other side has opened the same name
ch.send(body)                    // a message (JSON)
await ch.request(body)           // the other side's answer (onrequest's return value)
ch.close()
```

- Channels run on Protomux, on the same stream as replication.
- For what must not be stored: the secret handover, requests answered in
  code (the resource name service, request delivery). Later, dedicated
  channels.

**Instrumentation**: `channel-opened`, `channel-closed`, `message`
(direction, type, bytes), `request-failed`. Never the content: a message
may carry a secret.

`npm test`: 2 tests.

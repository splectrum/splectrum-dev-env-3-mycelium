// mycelium-value-json: an encoding, as a handler:
// one value to bytes and back, as JSON. A handler is { extension, encode,
// decode }; a container is given one, so another encoding (AVRO) is
// another handler, not a change to its users.
export const extension = 'json'
export const encode = value => Buffer.from(JSON.stringify(value) + '\n')
export const decode = bytes => JSON.parse(bytes.toString('utf8'))

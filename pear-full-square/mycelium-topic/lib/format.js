// Formats, by extension: an object's bytes parsed into an array of
// records. JSON first: a JSON object is one record, a JSON array its
// elements. Every read is an array.

const parsers = {
  json: bytes => {
    const v = JSON.parse(Buffer.from(bytes).toString('utf8'))
    return Array.isArray(v) ? v : [v]
  }
}

export function extensionOf (name) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1) : null
}

export function parseRecords (name, bytes) {
  const parse = parsers[extensionOf(name)]
  if (!parse) throw new Error(`no format for ${name}`)
  return parse(bytes)
}

export const encodeJson = v => Buffer.from(JSON.stringify(v) + '\n')

// A record (docs/design/repositories.md, "Every message is a Kafka record"):
// the base's minimum, { topic, timestamp, headers, value }. The topic is the
// URI where it lives, rewritten as it moves; headers are JSON, namespaced
// (`mrepo` the framework's); the value travels unchanged.
export const record = (topic, value, headers = {}) => ({ topic, timestamp: new Date().toISOString(), headers, value })
export const moved = (rec, topic) => ({ ...rec, topic })
export const withHeader = (rec, ns, data) => ({ ...rec, headers: { ...rec.headers, [ns]: { ...rec.headers?.[ns], ...data } } })

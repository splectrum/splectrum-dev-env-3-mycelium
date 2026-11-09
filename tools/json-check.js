// Is a file (or a string) one JSON value? Exit 0 if so, 1 if not: for
// shell scripts checking a line or a record, on Bare.
//   tools/bare tools/json-check.js --file=<path> | --text=<json>
import process from 'bare-process'
import { readFileSync } from 'bare-fs'
const [arg] = process.argv.slice(2)
try {
  JSON.parse(arg.startsWith('--file=') ? readFileSync(arg.slice(7), 'utf8') : arg.startsWith('--text=') ? arg.slice(7) : '')
} catch { process.exitCode = 1 }

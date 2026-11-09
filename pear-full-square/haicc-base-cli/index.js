// haicc-base-cli: HAICC's commands, as a library (haicc.js is the command
// line on it). Each command takes its arguments and returns its exit code:
// 0 done; 1 not done; 2 a bad call.
//   import { commands, version } from 'haicc-base-cli'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }

export const commands = {
  version: () => { console.log(JSON.stringify(version)); return 0 }
}

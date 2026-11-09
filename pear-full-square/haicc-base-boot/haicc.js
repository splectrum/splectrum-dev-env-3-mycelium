// haicc: HAICC's command line, the package's entry (its bundle's main).
//   bare base-package-haicc.bundle <command> [args]   (or bare haicc.js …)
//   version   this module's name and version, as one JSON line
// Exit 0 done; 1 not done; 2 a bad call.
import process from 'bare-process'
import { commands } from './index.js'

const [command, ...args] = process.argv.slice(2)

if (!commands[command]) {
  console.error(`haicc: ${command ? `no command '${command}'` : 'a command is needed'} (${Object.keys(commands).join(', ')})`)
  process.exitCode = 2
} else {
  process.exitCode = commands[command](args)
}

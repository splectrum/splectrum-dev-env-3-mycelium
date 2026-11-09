// mycelium: a running repository's main thread, from the command line (the
// package's entry, its bundle's main):
//   bare base-package-mycelium.bundle version     its name and version
// Prints one JSON value. Exit 0 done; 2 a bad call.
import process from 'bare-process'
import { version } from './index.js'

const [command] = process.argv.slice(2)
if (command === 'version') {
  console.log(JSON.stringify(version))
} else {
  console.error(`mycelium: ${command ? `no command '${command}'` : 'a command is needed'} (version)`)
  process.exitCode = 2
}

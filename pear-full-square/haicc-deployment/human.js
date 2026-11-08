// The command's JSON line, read by a person.
//   node cli.js <verb> <project.json> | node human.js
import { readFileSync } from 'bare-fs'
import { humanText } from './lib/human.js'

console.log(humanText(JSON.parse(readFileSync(0, 'utf8'))))

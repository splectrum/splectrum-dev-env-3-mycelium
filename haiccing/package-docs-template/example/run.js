// The package's entry: bare run.js [--work=<folder>] (the current folder
// by default). Our code from the package's own modules/, by relative path.
const arg = Bare.argv.slice(2).find(a => a.startsWith('--work='))
const work = arg ? arg.slice('--work='.length) : '.'
console.log(JSON.stringify({ package: 'base-package-example', work }))

// A failure the command line ends with: what is said (haicc: <message>, on
// stderr) and the exit code.
//   1   the command's own error, from the mrepo
//   2   not a command, or its arguments wrong
//   3   something is missing: the boot mrepo, a package, a download
//   4   no response in time
//   5   a response with no completed form
export class Failure extends Error {
  constructor (message, code = 1) { super(message); this.code = code }
}

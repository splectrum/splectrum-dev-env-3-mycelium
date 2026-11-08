// HAICC's log: what a command prints (its stdout and stderr), appended as
// it is printed, in order, to the current file in <work>/log/: files of
// 10 KB, each named by its first command's start in UTC
// (20261106T103312Z.log), so the folder lists in time order and the
// newest is the current one. A command starts a new file, named by its own
// start, when the current one is over 10 KB (whole commands a file). Each
// command: a header line (its real start, the command, its folder, its
// level) and a close line (its exit code, how long it took), on stdout too:
// where each command starts and ends. The setup and
// the boot's stage 1 (in shell) write the same way. The managers' copy
// (haicc-base-boot has the root's).
//   const log = openLog({ dir, command, level })   its stdout and stderr, teed from now
//   openLog({ command, file: false })   the header and close line on stdout only (a command
//        run by another that echoes and logs it)
import { appendFileSync, mkdirSync, statSync, readdirSync, writeSync } from 'bare-fs'
import { join } from 'bare-path'
import hrtime from 'bare-hrtime'
import process from 'bare-process'

export const LIMIT = 10 * 1024
export const LEVELS = ['normal', 'verbose', 'debug']
const NAME = /^\d{8}T\d{6}Z\.log$/

// The current file (the newest), or a new one named by this start.
export function logFile (dir, start = new Date()) {
  const newest = readdirSync(dir).filter(f => NAME.test(f)).sort().at(-1)
  if (newest && statSync(join(dir, newest)).size < LIMIT) return join(dir, newest)
  return join(dir, start.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z') + '.log')
}

export function openLog ({ dir, command, level = 'normal', file: logged = true }) {
  // The start: its wall-clock time for the header; how long, from a clock that
  // never steps back (a wall clock can: WSL2's did, once).
  const t0 = Date.now()
  const m0 = hrtime.bigint()
  let file = null
  if (logged) { mkdirSync(dir, { recursive: true }); file = logFile(dir, new Date(t0)) }
  const write = text => { if (file) try { appendFileSync(file, text) } catch {} }
  // Everything it prints, through either channel (console.log, or a stream's
  // write), written at once and in order: to the terminal (or pipe) and to
  // the log. On Bare, console.log does not go through process.stdout, and a
  // stream's buffered output is lost to an exit.
  const put = (fd, text) => {
    write(text)
    const b = Buffer.from(text)
    for (let at = 0; at < b.length;) { try { at += writeSync(fd, b, at, b.length - at) } catch (err) { if (err.code !== 'EAGAIN') return } }
  }
  const say = v => typeof v === 'string' ? v : v instanceof Error ? (v.stack || v.message) : JSON.stringify(v)
  process.stdout.write = chunk => { put(1, String(chunk)); return true }
  process.stderr.write = chunk => { put(2, String(chunk)); return true }
  console.log = (...args) => put(1, args.map(say).join(' ') + '\n')
  console.error = (...args) => put(2, args.map(say).join(' ') + '\n')
  // Said on stdout too, as the log has it: where a command starts, and ends.
  put(1, `== ${new Date(t0).toISOString()} ${command.join(' ')}  (in ${process.cwd()}${level === 'normal' ? '' : `, ${level}`})\n`)
  process.on('exit', code => put(1, `== exit ${code}, ${(Number(hrtime.bigint() - m0) / 1e9).toFixed(1)} s\n`))
  return {
    // To the log only (what the terminal already shows: a question answered there).
    note: text => write(text),
    level,
    verbose: LEVELS.indexOf(level) >= 1,
    debug: LEVELS.indexOf(level) >= 2
  }
}

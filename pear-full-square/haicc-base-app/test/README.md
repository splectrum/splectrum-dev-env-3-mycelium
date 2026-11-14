# test/

The tests of haicc-base-app, a section per file, each test by its name.

## `command.test.js`

- a command for the mrepos: at the root written plain, elsewhere the haicc command as it is
- the machine level, the usage, the sources
- refused, exit 2: not a command, or its arguments wrong

## `print.test.js`

- unpack: what fits stays as stored, what does not is opened, an entry a line
- unpack: nothing of a record changed, at any width
- outcome: the completed form three deep, its output or its error; neither: none

## `request.test.js`

- request: the record written, value by value; its response read as stored
- request: no response in time: exit 4, the key said; the request stays

## `sources.test.js`

- sources: the folders first, in the order linked, then https; a file in the first folder that holds it
- haicc sources: the list, unlink, https and no-https, download

## `main.test.js`

- the usage; not a command: exit 2, said on stderr
- nothing booted: an mrepo command and the teardown say so, exit 3; a deploy without the boot component in the sources
- haicc sources: printed a line a source
- a command for the mrepos: its response printed unpacked, as stored, or its output alone; an error, exit 1; no completed form, exit 5; none in time, exit 4
- boot/teardown: what boot/deploy put in place removed, nothing else; no runtime running: none stopped

# unpack

Unpacks a stored record across lines in a compact form, changing nothing of it.

A container, an object or an array, that fits on the line is left as it
is stored. One that does not is opened: an entry a line, indented by two,
and so on inside it. Only line breaks, indentation and a space after the
colon of an opened object's keys are added.

## Signature

`unpack(text, width)`: the record as stored, and the width to fit it to,
80 by default.

## Returns

The text, across lines, without a line break at its end.

## Design

A scanner over the text, not a parser: it follows strings and depth, so
numbers, escapes and the order of keys stay exactly as stored. Taking the
line breaks, the indentation and the added spaces off again gives the
record back.

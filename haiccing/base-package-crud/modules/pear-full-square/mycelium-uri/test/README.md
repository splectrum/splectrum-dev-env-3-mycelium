# test/

The tests of mycelium-uri, a section per file, each test by its name.

## `names.test.js`

- names: lowercase words joined by single hyphens
- data names: lowerCamelCase, no two capitals in a row, no _
- a data name and its URI form, exact both ways

## `uri.test.js`

- isSegment
- validate: canonical URIs pass unchanged
- validate: accepted deviations are fixed
- validate: broken rules throw
- validate: star steps
- sameName
- isUri: canonical only
- parse
- format
- join
- parent
- split

## `relative.test.js`

- relative: no leading slash, . the position itself, ./ allowed in front
- from, within: to and from a position
- slashed, unslashed: the slash-led paths
- a URI as data: an array of segments, each a relative URI

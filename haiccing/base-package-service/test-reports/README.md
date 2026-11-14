# test-reports/

The proof that the package's tests were run and passed: the report of its last pre-release.

| file | holds |
|---|---|
| `full.md` | the report to read: a sentence, an overview, a table of the units |
| `full.json` | the same as data: every unit, its tests, its asserts, its failures |

## The report

```json
{
  "package": "haiccing/<package>",
  "content": "<hash>",
  "bare": "v1.36.0",
  "date": "2026-01-01T00:00:00.000Z",
  "set": "full",
  "ok": true,
  "units": [
    { "unit": "/test/code", "ok": true,
      "tests": { "passed": 1, "total": 1 },
      "asserts": { "passed": 2, "total": 2 },
      "failures": [] }
  ]
}
```

`full.md` is written from it, never by hand.

`content` is what the report certifies: a hash of everything in the
package's bundle but its test reports. It is the same before and after
the report is added, so the report can travel inside the bundle it
proves.

## Pre-release

The report is written by the package's pre-release, before any release:
the package is bundled, its `full` set run from the bundle, the report
written and the package bundled again with it. A release holds the report
of its own pre-release.

When nothing in the package changed, its content is the same and its
report is current: nothing is run again, and the same release comes out.
A report that names another content is stale: the package changed since
it was tested.

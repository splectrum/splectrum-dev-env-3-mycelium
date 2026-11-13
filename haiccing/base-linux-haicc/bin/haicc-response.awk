# haicc-response.awk: a response record read, its completed form's output or
# error found. The record is JSON: an envelope around a core around the form,
# so the form's own keys are three objects deep. Its output is printed as it
# is (JSON), exit 0; its error, a string, on stderr, exit 1; neither: exit 5.
# A scanner, not a parser: it follows strings and depth, nothing more.
#   awk -f haicc-response.awk [-v quiet=1] <record.json>     (quiet: the
#       output not printed, only the exit code and the error)
{ s = s $0 "\n" }
END {
  n = length(s); depth = 0; instr = 0; esc = 0; expect = 0; readkey = 0; gotkey = 0; cap = 0
  key = ""; cur = ""; val = ""
  for (i = 1; i <= n; i++) {
    c = substr(s, i, 1)
    if (instr) {
      if (cap) val = val c
      if (esc) { esc = 0; if (readkey) cur = cur c; continue }
      if (c == "\\") { esc = 1; if (readkey) cur = cur c; continue }
      if (c == "\"") { instr = 0; if (readkey) { key = cur; readkey = 0; gotkey = 1 }; continue }
      if (readkey) cur = cur c
      continue
    }
    if (c == "\"") {
      instr = 1
      if (cap) val = val c
      else if (depth == 3 && expect) { readkey = 1; cur = ""; expect = 0 }
      continue
    }
    if (cap) {
      if (depth == 3 && (c == "," || c == "}")) { out[key] = val; has[key] = 1; cap = 0; val = "" }
      else val = val c
    }
    if (c == "{" || c == "[") {
      depth++
      # a new object three deep: the form is the last of them
      if (c == "{" && depth == 3) { expect = 1; delete has["output"]; delete has["error"] }
    } else if (c == "}" || c == "]") depth--
    else if (c == "," && depth == 3) expect = 1
    else if (c == ":" && depth == 3 && gotkey) {
      gotkey = 0
      if (key == "output" || key == "error") { cap = 1; val = "" }
    }
  }
  if ("error" in has) {
    e = out["error"]
    gsub(/^[ \t\n]+|[ \t\n]+$/, "", e)
    sub(/^"/, "", e); sub(/"$/, "", e)
    gsub(/\\"/, "\"", e); gsub(/\\n/, " ", e); gsub(/\\\\/, "\\", e)
    print "haicc: " e > "/dev/stderr"
    exit 1
  }
  if ("output" in has) {
    o = out["output"]
    gsub(/^[ \t\n]+|[ \t\n]+$/, "", o)
    if (!quiet) print o
    exit 0
  }
  print "haicc: the response holds no completed form" > "/dev/stderr"
  exit 5
}

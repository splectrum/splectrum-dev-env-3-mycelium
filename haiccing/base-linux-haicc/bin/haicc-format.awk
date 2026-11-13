# haicc-format.awk: a record printed unpacked, across lines, in a compact
# form. A container (an object, an array) that fits on the line is left as
# it is stored; one that does not is opened: an entry a line, indented by
# two, and so on inside it. Nothing of the record is changed: only line
# breaks, indentation, and a space after the colon of an opened object's
# keys are added.
#   awk -f haicc-format.awk [-v width=<columns>] <record.json>     (80)
function vend (i,    c, j, e) {
  c = substr(s, i, 1)
  if (c == "{" || c == "[") return shut[i]
  if (c == "\"") {
    e = 0
    for (j = i + 1; j <= n; j++) {
      c = substr(s, j, 1)
      if (e) e = 0
      else if (c == "\\") e = 1
      else if (c == "\"") return j
    }
    return n
  }
  for (j = i; j <= n; j++) {
    c = substr(s, j, 1)
    if (c == "," || c == "}" || c == "]") return j - 1
  }
  return n
}
function skip (i) { while (i <= n && substr(s, i, 1) ~ /[ \t\n]/) i++; return i }
function pad (k,    r) { r = ""; while (k-- > 0) r = r " "; return r }
# The value at i..e printed: ind the indentation of the line it is on, col
# the column it starts at.
function emit (i, e, ind, col,    c, p, k, ke, v, ve, key) {
  c = substr(s, i, 1)
  if ((c != "{" && c != "[") || e - i + 1 + col <= width || e == i + 1) { printf "%s", substr(s, i, e - i + 1); return }
  printf "%s\n", c
  p = skip(i + 1)
  while (p < e) {
    printf "%s", pad(ind + 2)
    if (c == "{") {
      ke = vend(p); key = substr(s, p, ke - p + 1)
      v = skip(ke + 1); v = skip(v + 1)          # past the colon
      printf "%s: ", key
      ve = vend(v)
      emit(v, ve, ind + 2, ind + 2 + length(key) + 2)
    } else {
      v = p; ve = vend(v)
      emit(v, ve, ind + 2, ind + 2)
    }
    p = skip(ve + 1)
    if (substr(s, p, 1) == ",") { printf ",\n"; p = skip(p + 1) } else printf "\n"
  }
  printf "%s%s", pad(ind), substr(s, e, 1)
}
{ s = s $0 }
END {
  if (!width) width = 80
  n = length(s); sp = 0; instr = 0; esc = 0
  # the matching end of each container (strings passed over)
  for (i = 1; i <= n; i++) {
    c = substr(s, i, 1)
    if (instr) { if (esc) esc = 0; else if (c == "\\") esc = 1; else if (c == "\"") instr = 0; continue }
    if (c == "\"") instr = 1
    else if (c == "{" || c == "[") stack[++sp] = i
    else if (c == "}" || c == "]") { shut[stack[sp]] = i; sp-- }
  }
  i = skip(1)
  if (i > n) exit 0
  emit(i, vend(i), 0, 0)
  printf "\n"
}

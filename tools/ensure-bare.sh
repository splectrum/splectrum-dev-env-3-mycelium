# Ensure Bare's runtime, pinned: the tarball of bare-runtime-linux-x64 at a
# given URL, checked against its sha512 (the lockfile's SRI form,
# sha512-<base64>), unpacked into a folder; a Bare already there and from
# that same tarball (its recorded hash) is kept. Downloads with curl (in
# the shell: docs/rules.md 26). POSIX sh, coreutils only; sourced by
# tools/install.sh and copied into the setup's header.
#   ensure_bare <url> <sha512-SRI> <folder>     -> <folder>/bin/bare, executable
ensure_bare () {
  _url=$1; _sri=$2; _dir=$3
  _want=$(printf '%s' "${_sri#sha512-}" | base64 -d | od -An -v -tx1 | tr -d ' \n')
  if [ -x "$_dir/bin/bare" ] && [ -f "$_dir/tarball.sha512" ] && [ "$(cat "$_dir/tarball.sha512")" = "$_want" ]; then return 0; fi
  _tmp=$(mktemp -d)
  echo "fetching Bare's runtime: $_url"
  curl -fsSL --retry 3 --connect-timeout 20 -o "$_tmp/bare.tgz" "$_url" || { echo "could not fetch Bare's runtime: $_url"; rm -rf "$_tmp"; return 1; }
  _got=$(sha512sum "$_tmp/bare.tgz" | cut -d' ' -f1)
  [ "$_got" = "$_want" ] || { echo "Bare's runtime is not as pinned (sha512): $_url"; rm -rf "$_tmp"; return 1; }
  rm -rf "$_dir"; mkdir -p "$_dir"
  tar -xzf "$_tmp/bare.tgz" -C "$_dir" --strip-components=1 || { rm -rf "$_tmp"; return 1; }
  chmod +x "$_dir/bin/bare"
  printf '%s' "$_want" > "$_dir/tarball.sha512"
  rm -rf "$_tmp"
}

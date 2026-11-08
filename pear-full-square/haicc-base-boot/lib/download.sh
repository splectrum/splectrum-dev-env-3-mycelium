# A download that says how it goes: sourced by step0.sh and fetch.sh.
#   download <url> <file>
# Says the size every 5 s, and when no data is arriving. A lost or stalled
# connection is tried again, resuming, up to six times, waiting a little
# longer each time; not found is not. Returns 0, 1 when the server says it
# is not there, 2 when the connection failed.
download () {
  dl_try=1; dl_s=0; dl_was=0
  rm -f "$2"
  while :; do
    curl -fsSL -C - --connect-timeout 20 --speed-time 30 --speed-limit 1024 "$1" -o "$2" 2>"$2.err" &
    dl_pid=$!
    while kill -0 "$dl_pid" 2>/dev/null; do
      sleep 1
      dl_s=$((dl_s + 1))
      [ $((dl_s % 5)) = 0 ] && kill -0 "$dl_pid" 2>/dev/null || continue
      dl_now=$( (wc -c < "$2") 2>/dev/null || echo 0)
      if [ "$dl_now" = "$dl_was" ]; then echo "    no data arriving at the moment ($((dl_now / 1048576)) MB so far, ${dl_s} s)"
      else echo "    $((dl_now / 1048576)) MB so far (${dl_s} s)"; fi
      dl_was=$dl_now
    done
    wait "$dl_pid"; dl_code=$?
    dl_why=$(tail -1 "$2.err" 2>/dev/null); rm -f "$2.err"
    [ "$dl_code" = 0 ] && return 0
    case $dl_code in
      22) echo "    not available: $dl_why"; return 1 ;;   # the server said no
      33) rm -f "$2" ;;                                    # it cannot resume: from the start
    esac
    if [ "$dl_try" -ge 6 ]; then echo "    download failed after 6 tries: $dl_why"; return 2; fi
    dl_wait=$((dl_try * ${DL_WAIT:-5}))
    dl_try=$((dl_try + 1))
    echo "    connection lost ($dl_why): trying again in $dl_wait s, $dl_try of 6..."
    sleep "$dl_wait"
  done
}

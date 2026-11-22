#!/usr/bin/env bash
# Copies the helpers in shared/ into every mod that already carries a copy of them
# (in <mod>/hooks/). With --check, changes nothing and fails when a copy differs.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
check=0
[ "${1:-}" = "--check" ] && check=1

status=0
for helper in "$root"/shared/*; do
  name="$(basename "$helper")"
  for copy in "$root"/*/hooks/"$name"; do
    [ -e "$copy" ] || continue
    if ! cmp -s "$helper" "$copy"; then
      if [ "$check" -eq 1 ]; then
        echo "out of date: ${copy#"$root"/} (run scripts/sync-shared.sh)"
        status=1
      else
        cp "$helper" "$copy"
        echo "updated: ${copy#"$root"/}"
      fi
    fi
  done
done

exit "$status"

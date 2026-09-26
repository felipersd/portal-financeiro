#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
RELEASE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec 9>"$ROOT/deploy.lock"
flock -w 600 9
source "$RELEASE_DIR/blue-green.sh"
trap 'result=$?; if [[ -d "$STATE/transition" ]]; then recover_transition || true; result=1; fi; exit "$result"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
recover_transition
target=$(cat "$ROOT/previous-release")
slot=$(cat "$STATE/previous-slot")
valid_release "$target" && valid_slot "$slot"
# The previous stack is retained. No image recreation, migration or database restore.
promote_slot "$slot" "$target"

#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
exec 9>"$ROOT/deploy.lock"
flock -w 600 9
TARGET=$(cat "$ROOT/previous-release")
CURRENT=$(cat "$ROOT/current-release")
[[ "$CURRENT" =~ ^/srv/portal-financeiro/releases/[a-f0-9]{40}/deploy$ ]] || exit 1
[[ "$TARGET" =~ ^/srv/portal-financeiro/releases/[a-f0-9]{40}/deploy$ ]] || exit 1
test -f "$TARGET/images.env"
source "$CURRENT/rollback-compatibility.sh"
assert_rollback_compatible "$TARGET" docker compose --env-file "$ROOT/config.env" --env-file "$CURRENT/images.env" -f "$CURRENT/compose.vps.yml"
docker compose --env-file "$ROOT/config.env" --env-file "$TARGET/images.env" -f "$TARGET/compose.vps.yml" up -d --wait --wait-timeout 240
curl -fsS --max-time 15 http://127.0.0.1:8081/health/identity
curl -fsS --max-time 15 http://127.0.0.1:8081/health/finance
printf '%s\n' "$CURRENT" > "$ROOT/previous-release"
printf '%s\n' "$TARGET" > "$ROOT/current-release.tmp"
mv -- "$ROOT/current-release.tmp" "$ROOT/current-release"
echo 'Previous application restored. Database preserved.'

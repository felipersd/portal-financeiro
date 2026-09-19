#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
exec 9>"$ROOT/deploy.lock"
flock -w 600 9
RELEASE_DIR=$(cat "$ROOT/current-release")
[[ "$RELEASE_DIR" =~ ^/srv/portal-financeiro/releases/[a-f0-9]{40}/deploy$ ]] || exit 1
COMPOSE=(docker compose --env-file "$ROOT/config.env" --env-file "$RELEASE_DIR/images.env" -f "$RELEASE_DIR/compose.vps.yml")
OUTPUT="$ROOT/backups/daily-$(date -u +%Y%m%dT%H%M%SZ).dump"
"${COMPOSE[@]}" exec -T db pg_dump -U portal -d finance_db -Fc > "$OUTPUT.partial"
"${COMPOSE[@]}" exec -T db pg_restore --list < "$OUTPUT.partial" > /dev/null
mv -- "$OUTPUT.partial" "$OUTPUT"
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
echo "Backup complete: $OUTPUT"

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
# Local success alone is insufficient when offsite backup is enabled.
if [[ -f "$ROOT/secrets/restic.env" ]]; then
  bash "$ROOT/offsite-backup.sh" "$OUTPUT"
else
  echo 'Offsite backup is not configured.' >&2
  exit 1
fi
# Only our timestamped daily archives are rotated after verified remote success.
find "$ROOT/backups" -maxdepth 1 -type f \( -name 'daily-????????T??????Z.dump' -o -name 'daily-????????T??????Z.dump.sha256' \) -mtime +14 -delete
echo "Local and encrypted offsite backup complete: $OUTPUT"

#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
restic() { bash "$ROOT/restic.sh" "$@"; }
exec 9>"$ROOT/deploy.lock"
flock -w 600 9
source "$ROOT/secrets/restic.env"
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
[[ "$RESTIC_REPOSITORY" == s3:https://*.r2.cloudflarestorage.com/backup-financas/portal-financeiro/restic ]] || exit 1
work=$(mktemp -d "$ROOT/backups/restore-check.XXXXXXXX")
container="portal-restore-check-$(date -u +%s)-$$"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f -- "$work/database.dump"
  rmdir -- "$work"
}
trap cleanup EXIT
restic check --read-data-subset=10%
restic dump --tag portal-financeiro --host portal-vps latest database.dump > "$work/database.dump"
test -s "$work/database.dump"
# Isolated disposable container: no production network, credentials or volume.
docker run -d --name "$container" --network none --memory 512m -e POSTGRES_HOST_AUTH_METHOD=trust postgres:15-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" createdb -U postgres restored
docker exec -i "$container" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d restored < "$work/database.dump"
docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d restored -c 'SELECT count(*) FROM finance."Transaction"' >/dev/null
docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d restored -c 'SELECT count(*) FROM identity."User"' >/dev/null
# Weekly reclamation applies only to this dedicated repository, after a successful real restore.
restic forget --tag portal-financeiro --host portal-vps --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
date -u +%s > "$ROOT/backups/restore-last-success.tmp"
mv -- "$ROOT/backups/restore-last-success.tmp" "$ROOT/backups/restore-last-success"
echo 'Encrypted remote backup restored successfully in an isolated PostgreSQL container.'

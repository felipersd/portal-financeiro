#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
DUMP=${1:?Backup archive required}
[[ $(realpath -- "$DUMP") == "$ROOT/backups/"*.dump ]] || exit 1
test -s "$DUMP"
# root/portal-owned file, mode 0600, contains only the dedicated R2 repository credentials.
source "$ROOT/secrets/restic.env"
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
: "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD_FILE:?}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}"
[[ "$RESTIC_REPOSITORY" == s3:https://*.r2.cloudflarestorage.com/backup-financas/portal-financeiro/restic ]] || exit 1
restic backup --stdin --stdin-filename database.dump --tag portal-financeiro --host portal-vps < "$DUMP"
restic check --no-lock
restic forget --tag portal-financeiro --host portal-vps --keep-daily 14 --keep-weekly 8 --keep-monthly 12
# Atomic success marker is only advanced after the remote archive has been checked.
date -u +%s > "$ROOT/backups/offsite-last-success.tmp"
mv -- "$ROOT/backups/offsite-last-success.tmp" "$ROOT/backups/offsite-last-success"

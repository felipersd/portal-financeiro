#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
RELEASE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ "$RELEASE_DIR" =~ ^/srv/portal-financeiro/releases/[a-f0-9]{40}/deploy$ ]] || exit 1
REGISTRY_USER=${1:?Registry username required}
[[ "$REGISTRY_USER" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]*$ ]] || exit 1
exec 9>"$ROOT/deploy.lock"
flock -w 600 9
test -f "$ROOT/config.env"
test -f "$RELEASE_DIR/images.env"
for service in IDENTITY FINANCE FRONTEND GATEWAY; do
  value=$(sed -n "s/^${service}_IMAGE=//p" "$RELEASE_DIR/images.env")
  [[ "$value" =~ ^ghcr\.io/felipersd/portal-financeiro-(identity|finance|frontend|gateway)@sha256:[a-f0-9]{64}$ ]] || exit 1
done
REVISION=$(basename "$(dirname "$RELEASE_DIR")")
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
cleanup() { rm -f -- "$DOCKER_CONFIG/config.json"; rmdir -- "$DOCKER_CONFIG" 2>/dev/null || true; }
trap cleanup EXIT
docker login ghcr.io -u "$REGISTRY_USER" --password-stdin
COMPOSE=(docker compose --env-file "$ROOT/config.env" --env-file "$RELEASE_DIR/images.env" -f "$RELEASE_DIR/compose.vps.yml")
source "$RELEASE_DIR/rollback-compatibility.sh"
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" pull
"${COMPOSE[@]}" up -d --wait --wait-timeout 120 db
# The database is backed up before migrations, including the first empty database.
BACKUP="$ROOT/backups/pre-release-$(date -u +%Y%m%dT%H%M%SZ)-$REVISION.dump"
"${COMPOSE[@]}" exec -T db pg_dump -U portal -d finance_db -Fc > "$BACKUP.partial"
"${COMPOSE[@]}" exec -T db pg_restore --list < "$BACKUP.partial" > /dev/null
mv -- "$BACKUP.partial" "$BACKUP"
sha256sum "$BACKUP" > "$BACKUP.sha256"
previous=''
[[ ! -f "$ROOT/current-release" ]] || previous=$(cat "$ROOT/current-release")
rollback() {
  echo 'Release failed. Backup retained; database is never restored automatically.' >&2
  if [[ "$previous" =~ ^/srv/portal-financeiro/releases/[a-f0-9]{40}/deploy$ && -f "$previous/images.env" ]]; then
    if assert_rollback_compatible "$previous" "${COMPOSE[@]}"; then
      docker compose --env-file "$ROOT/config.env" --env-file "$previous/images.env" -f "$previous/compose.vps.yml" up -d --wait --wait-timeout 180
    else
      "${COMPOSE[@]}" stop gateway || true
    fi
  else
    "${COMPOSE[@]}" stop gateway || true
  fi
}
deploy() {
  # Schema changes must remain backward-compatible with the previous release.
  "${COMPOSE[@]}" run --rm --no-deps identity-service ./node_modules/.bin/prisma migrate deploy || return 1
  "${COMPOSE[@]}" run --rm --no-deps finance-service ./node_modules/.bin/prisma migrate deploy || return 1
  "${COMPOSE[@]}" up -d --wait --wait-timeout 240 || return 1
  for service in identity finance; do
    curl -fsS --max-time 15 "http://127.0.0.1:8081/health/$service" | grep -F "$REVISION" || return 1
  done
  curl -fsS --max-time 15 http://127.0.0.1:8081/version.json | grep -F "$REVISION" || return 1
  [[ $(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/api/transactions) == 401 ]] || return 1
  [[ $(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8081/api/users) == 404 ]] || return 1
}
if ! deploy; then rollback; exit 1; fi
printf '%s\n' "$previous" > "$ROOT/previous-release"
printf '%s\n' "$RELEASE_DIR" > "$ROOT/current-release.tmp"
mv -- "$ROOT/current-release.tmp" "$ROOT/current-release"
echo "Release healthy: $REVISION"

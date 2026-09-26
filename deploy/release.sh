#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=/srv/portal-financeiro
RELEASE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REGISTRY_USER=${1:?Registry username required}
[[ "$REGISTRY_USER" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]*$ ]] || exit 1
exec 9>"$ROOT/deploy.lock"
flock -w 600 9
source "$RELEASE_DIR/blue-green.sh"
valid_release "$RELEASE_DIR"
test -f "$ROOT/config.env"
for service in IDENTITY FINANCE FRONTEND GATEWAY; do
  value=$(image_for "$RELEASE_DIR" "$service")
  [[ "$value" =~ ^ghcr\.io/felipersd/portal-financeiro-(identity|finance|frontend|gateway)@sha256:[a-f0-9]{64}$ ]] || exit 1
done
install -d -m 700 "$STATE"
install -d -m 755 "$RUNTIME"
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
cleanup() {
  local result=$?
  trap - EXIT
  if [[ -d "$STATE/transition" ]]; then
    recover_transition || echo 'Automatic route recovery needs attention. Both applications were kept running; recovery journal retained.' >&2
    result=1
  fi
  rm -f -- "$DOCKER_CONFIG/config.json"
  rmdir -- "$DOCKER_CONFIG" 2>/dev/null || true
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
docker login ghcr.io -u "$REGISTRY_USER" --password-stdin
recover_transition
current=$(cat "$ROOT/current-release")
valid_release "$current"
assert_same_contract "$current" "$RELEASE_DIR"
active=legacy
[[ ! -f "$RUNTIME/active-slot" ]] || active=$(cat "$RUNTIME/active-slot")
valid_slot "$active"
docker exec "$CADDY_CONTAINER" cat "$SITE" | grep -F "reverse_proxy $(slot_host "$active"):80" > /dev/null
probe_slot "$active" "$current"
if [[ "$current" == "$RELEASE_DIR" ]]; then probe_public "$current"; echo 'Release already active.'; exit 0; fi
if [[ "$active" == blue ]]; then candidate=green; else candidate=blue; fi
if [[ -f "$STATE/promoted-at" ]]; then
  promoted_at=$(cat "$STATE/promoted-at")
  [[ "$promoted_at" =~ ^[0-9]+$ ]]
  elapsed=$(( $(date -u +%s) - promoted_at ))
  if (( elapsed < 60 )); then sleep "$(( 60 - (elapsed < 0 ? 0 : elapsed) ))"; fi
fi
[[ -f "$RUNTIME/active-slot" ]] || write_value "$RUNTIME/active-slot" legacy 644
slot_compose "$candidate" "$RELEASE_DIR" config --quiet
slot_compose "$candidate" "$RELEASE_DIR" pull
finance_image=$(image_for "$RELEASE_DIR" FINANCE)
vapid_file=$(slot_compose "$candidate" "$RELEASE_DIR" config --format json | docker run --rm -i --network none --read-only --cap-drop ALL --security-opt no-new-privileges --entrypoint node "$finance_image" -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).secrets.vapid_keys.file)')
bash "$RELEASE_DIR/prepare-push-secret.sh" "$finance_image" "$vapid_file"

# The database is long-lived and never recreated by an application release.
[[ $(docker inspect --format '{{.State.Health.Status}}' "$DB_CONTAINER") == healthy ]]
network="portal-financeiro-$candidate"
docker network inspect "$network" > /dev/null 2>&1 || docker network create "$network" > /dev/null
if ! docker network inspect "$network" --format '{{range .Containers}}{{.Name}}{{"\n"}}{{end}}' | grep -Fx "$DB_CONTAINER" > /dev/null; then
  docker network connect --alias db "$network" "$DB_CONTAINER"
fi
# Only read migration metadata. A pending/modified/failed migration aborts here.
for service in identity finance; do
  slot_compose "$candidate" "$RELEASE_DIR" run --rm --no-deps -T "$service-service" node - "$service" < "$RELEASE_DIR/check-schema.cjs"
done

BACKUP="$ROOT/backups/pre-release-$(date -u +%Y%m%dT%H%M%SZ)-$(basename "$(dirname "$RELEASE_DIR")").dump"
docker exec "$DB_CONTAINER" pg_dump -U portal -d finance_db -Fc > "$BACKUP.partial"
docker exec -i "$DB_CONTAINER" pg_restore --list < "$BACKUP.partial" > /dev/null
mv -- "$BACKUP.partial" "$BACKUP"
sha256sum "$BACKUP" > "$BACKUP.sha256"
install -m 700 "$RELEASE_DIR/restic.sh" "$ROOT/restic.sh.tmp"
mv -- "$ROOT/restic.sh.tmp" "$ROOT/restic.sh"
bash "$RELEASE_DIR/offsite-backup.sh" "$BACKUP"

# Hashed assets remain available to browser tabs opened before the traffic switch.
for source in "$current" "$RELEASE_DIR"; do
  bash "$RELEASE_DIR/cache-assets.sh" "$CADDY_CONTAINER" "$(image_for "$source" FRONTEND)"
done
slot_compose "$candidate" "$RELEASE_DIR" up -d --wait --wait-timeout 240
probe_slot "$candidate" "$RELEASE_DIR"
for script in backup offsite-backup restore-check restic; do
  install -m 700 "$RELEASE_DIR/$script.sh" "$ROOT/$script.sh.tmp"
  mv -- "$ROOT/$script.sh.tmp" "$ROOT/$script.sh"
done
promote_slot "$candidate" "$RELEASE_DIR"
# After both managed slots exist, the original stack is no longer the rollback target.
# Keep it during the first transition; later retire only its applications, never its DB.
if [[ "$active" != legacy ]]; then
  docker stop --time 30 portal-financeiro-gateway-1 portal-financeiro-identity-service-1 portal-financeiro-finance-service-1 portal-financeiro-frontend-1 > /dev/null 2>&1 || true
fi
echo "Blue/green release healthy: $RELEASE_DIR"

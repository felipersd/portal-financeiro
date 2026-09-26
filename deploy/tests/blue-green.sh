#!/usr/bin/env bash
set -Eeuo pipefail
REPO=$(cd -- "$(dirname "$0")/../.." && pwd)
ROOT=$(mktemp -d)
RELEASE_DIR="$REPO/deploy"
source "$RELEASE_DIR/blue-green.sh"
id="portal-bg-test-$$"
CADDY_CONTAINER="$id-edge"
blue="$ROOT/releases/$(printf 'a%.0s' {1..40})/deploy"
green="$ROOT/releases/$(printf 'b%.0s' {1..40})/deploy"
poller=''
cleanup() {
  local result=$?
  if (( result != 0 )); then docker logs --tail 12 "$CADDY_CONTAINER" 2>&1 || true; fi
  touch "$ROOT/done"
  [[ -z "$poller" ]] || wait "$poller" || true
  docker rm -f -v "$id-blue" "$id-green" "$CADDY_CONTAINER" > /dev/null 2>&1 || true
  docker image rm "$id-assets:blue" "$id-assets:green" > /dev/null 2>&1 || true
  docker network rm "$id" > /dev/null 2>&1 || true
  rm -rf -- "$ROOT"
}
trap cleanup EXIT
mkdir -p "$STATE" "$RUNTIME" "$blue" "$green" "$ROOT/sites" "$ROOT/blue" "$ROOT/green"
for release in "$blue" "$green"; do touch "$release/images.env"; printf '3\n' > "$release/sharing-contract-version"; done
printf '%s\n' "$blue" > "$ROOT/current-release"
printf 'blue\n' > "$RUNTIME/active-slot"
printf 'blue' > "$ROOT/blue/version.json"
printf 'green' > "$ROOT/green/version.json"
printf 'http://portalfinanceiro.net {\n reverse_proxy portal-financeiro-blue-gateway:80\n}\n' > "$ROOT/sites/portalfinanceiro.caddy"
printf '{\n admin localhost:2019\n auto_https off\n}\nimport /data/sites/*.caddy\n' > "$ROOT/Caddyfile"
chmod 755 "$ROOT/sites" "$ROOT/blue" "$ROOT/green"
chmod 644 "$ROOT/Caddyfile" "$ROOT/sites/portalfinanceiro.caddy" "$ROOT/blue/version.json" "$ROOT/green/version.json"
docker network create "$id" > /dev/null
for slot in blue green; do
  docker run -d --name "$id-$slot" --network "$id" --network-alias "portal-financeiro-$slot-gateway" \
    --mount "type=bind,src=$ROOT/$slot,dst=/usr/share/nginx/html,readonly" nginx:stable-alpine > /dev/null
done
docker run -d --name "$CADDY_CONTAINER" --network "$id" -p 127.0.0.1::80 \
  --mount "type=bind,src=$ROOT/Caddyfile,dst=/etc/caddy/Caddyfile,readonly" \
  --mount "type=bind,src=$ROOT/sites,dst=/data/sites" caddy:2-alpine > /dev/null
port=$(docker port "$CADDY_CONTAINER" 80/tcp | sed 's/.*://')
public_color() { curl -fsS --max-time 2 -H 'Host: portalfinanceiro.net' "http://127.0.0.1:$port/version.json"; }
for attempt in {1..30}; do if [[ $(public_color 2>/dev/null || true) == blue ]]; then break; fi; sleep 1; done
[[ $(public_color) == blue ]]
# Exercise the same immutable asset cache used during first promotion and rollback.
for slot in blue green; do
  mkdir -p "$ROOT/build-$slot/assets"
  printf '%s' "$slot" > "$ROOT/build-$slot/assets/$slot-01234567.js"
  printf 'FROM nginx:stable-alpine\nCOPY assets /usr/share/nginx/html/assets\n' > "$ROOT/build-$slot/Dockerfile"
  docker build -q -t "$id-assets:$slot" "$ROOT/build-$slot" > /dev/null
  bash "$RELEASE_DIR/cache-assets.sh" "$CADDY_CONTAINER" "$id-assets:$slot"
done
assert_assets() {
  local slot
  for slot in blue green; do
    [[ $(curl -fsS --max-time 2 -H 'Host: portalfinanceiro.net' "http://127.0.0.1:$port/assets/$slot-01234567.js") == "$slot" ]]
  done
}
(
  while [[ ! -f "$ROOT/done" ]]; do
    curl -sS --max-time 2 -o /dev/null -w '%{http_code}\n' -H 'Host: portalfinanceiro.net' "http://127.0.0.1:$port/version.json" >> "$ROOT/statuses" || echo FAILED >> "$ROOT/statuses"
    sleep 0.05
  done
) & poller=$!

# Probes point only to isolated fixture containers, never production.
probe_slot() {
  [[ $(command docker exec "$CADDY_CONTAINER" wget -qO- "http://portal-financeiro-$1-gateway/version.json") == "$1" ]]
}
fail_public=false
probe_public() {
  local expected=blue
  [[ "$1" != "$green" ]] || expected=green
  if [[ "$fail_public" == true && "$expected" == green ]]; then return 1; fi
  [[ $(public_color) == "$expected" ]]
}
inject_config=false
docker() {
  if [[ "$inject_config" == true && "$*" == "exec $CADDY_CONTAINER caddy validate --config /etc/caddy/Caddyfile" ]]; then
    command docker exec "$CADDY_CONTAINER" sh -c 'printf "}\n" >> /data/sites/portalfinanceiro.caddy'
    inject_config=false
  fi
  command docker "$@"
}
assert_blue() { [[ $(public_color) == blue && $(cat "$RUNTIME/active-slot") == blue && $(cat "$ROOT/current-release") == "$blue" ]]; }

# Broken candidate never receives traffic.
docker stop "$id-green" > /dev/null
if promote_slot green "$green"; then exit 1; fi
assert_blue
docker start "$id-green" > /dev/null
for attempt in {1..30}; do if probe_slot green "$green" 2>/dev/null; then break; fi; sleep 1; done
# Invalid proxy config leaves the running Caddy config intact and is recoverable.
inject_config=true
if promote_slot green "$green"; then exit 1; fi
recover_transition
assert_blue
assert_assets
# A public failure after switching restores the old route, with no container restart.
fail_public=true
if promote_slot green "$green"; then exit 1; fi
[[ -d "$STATE/transition" ]]
recover_transition
assert_blue
fail_public=false
# An abandoned transition can be recovered from its on-disk record.
fail_public=true
if promote_slot green "$green"; then exit 1; fi
recover_transition
assert_blue
fail_public=false
# Successful promotion and manual reversal.
promote_slot green "$green"
[[ $(cat "$RUNTIME/active-slot") == green && $(public_color) == green ]]
assert_assets
promote_slot blue "$blue"
assert_blue
assert_assets
printf '4\n' > "$green/sharing-contract-version"
if promote_slot green "$green"; then exit 1; fi
assert_blue
touch "$ROOT/done"
wait "$poller"; poller=''
[[ -s "$ROOT/statuses" ]]
if grep -v '^200$' "$ROOT/statuses"; then echo 'HTTP interruption detected' >&2; exit 1; fi
printf 'Blue/green failure injection and rollback passed: %s HTTP requests, all 200.\n' "$(wc -l < "$ROOT/statuses")"

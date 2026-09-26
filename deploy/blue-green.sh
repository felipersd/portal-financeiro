#!/usr/bin/env bash
# Shared operations. Callers hold ROOT/deploy.lock for the whole transition.
STATE="$ROOT/deployment"
RUNTIME="$ROOT/runtime"
CADDY_CONTAINER=${PORTAL_CADDY_CONTAINER:-onepiece-library-caddy-1}
DB_CONTAINER=${PORTAL_DB_CONTAINER:-portal-financeiro-db-1}
SITE=/data/sites/portalfinanceiro.caddy

valid_release() {
  [[ "$1" == "$ROOT/releases/"*"/deploy" ]] || return 1
  local revision=${1#"$ROOT/releases/"}; revision=${revision%/deploy}
  [[ "$revision" =~ ^[a-f0-9]{40}$ && -f "$1/images.env" ]]
}
valid_slot() { [[ "$1" == blue || "$1" == green || "$1" == legacy ]]; }
slot_host() {
  valid_slot "$1" || return 1
  if [[ "$1" == legacy ]]; then printf 'portal-financeiro-gateway'; else printf 'portal-financeiro-%s-gateway' "$1"; fi
}
slot_compose() {
  local slot=$1 release=$2; shift 2
  [[ "$slot" == blue || "$slot" == green ]] && valid_release "$release" || return 1
  DEPLOYMENT_SLOT="$slot" docker compose -p "portal-financeiro-$slot" --env-file "$ROOT/config.env" --env-file "$release/images.env" -f "$release/compose.slot.yml" "$@"
}
image_for() { sed -n "s/^${2}_IMAGE=//p" "$1/images.env"; }
write_value() {
  printf '%s\n' "$2" > "$1.tmp" && chmod "${3:-600}" "$1.tmp" && mv -- "$1.tmp" "$1"
}
probe_slot() {
  local slot=$1 release=$2 network
  if [[ "$slot" == legacy ]]; then network=portal-financeiro_backend; else network="portal-financeiro-$slot"; fi
  docker run --rm -i --network "$network" --read-only --cap-drop ALL --security-opt no-new-privileges \
    --entrypoint node "$(image_for "$release" FINANCE)" - http://gateway:80 "$(basename "$(dirname "$release")")" < "$RELEASE_DIR/probe-release.cjs"
}
probe_public() {
  local release=$1
  docker run --rm -i --network host --read-only --cap-drop ALL --security-opt no-new-privileges \
    --entrypoint node "$(image_for "$release" FINANCE)" - https://portalfinanceiro.net "$(basename "$(dirname "$release")")" < "$RELEASE_DIR/probe-release.cjs"
}
write_site() {
  docker exec -i "$CADDY_CONTAINER" sh -c 'umask 022; cat > /data/sites/portalfinanceiro.caddy.next && mv /data/sites/portalfinanceiro.caddy.next /data/sites/portalfinanceiro.caddy' < "$1"
}
reload_site() {
  docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile &&
    docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
}
assert_same_contract() {
  local current=$1 candidate=$2
  [[ -f "$current/sharing-contract-version" && -f "$candidate/sharing-contract-version" &&
     $(cat "$current/sharing-contract-version") == "$(cat "$candidate/sharing-contract-version")" ]] || {
    echo 'Application contracts differ. A reviewed compatibility bridge is required; active services were preserved.' >&2
    return 1
  }
}
recover_transition() {
  [[ -d "$STATE/transition" ]] || return 0
  local old_slot old_release
  old_slot=$(cat "$STATE/transition/old-slot") || return 1
  old_release=$(cat "$STATE/transition/old-release") || return 1
  valid_slot "$old_slot" && valid_release "$old_release" || return 1
  probe_slot "$old_slot" "$old_release" || return 1
  write_site "$STATE/transition/before.caddy" && reload_site || return 1
  probe_public "$old_release" || return 1
  write_value "$RUNTIME/active-slot" "$old_slot" 644 &&
    write_value "$ROOT/current-release" "$old_release" &&
    write_value "$ROOT/previous-release" "$(cat "$STATE/transition/previous-release")" &&
    write_value "$STATE/previous-slot" "$(cat "$STATE/transition/previous-slot")" || return 1
  rm -r -- "$STATE/transition" || return 1
  echo 'Traffic restored to the previous release. Database and application containers preserved.'
}
promote_slot() {
  local candidate=$1 release=$2 active current before next journal
  valid_slot "$candidate" && valid_release "$release" || return 1
  [[ ! -e "$STATE/transition" ]] || return 1
  active=$(cat "$RUNTIME/active-slot") || return 1
  current=$(cat "$ROOT/current-release") || return 1
  valid_slot "$active" && valid_release "$current" && [[ "$candidate" != "$active" ]] || return 1
  assert_same_contract "$current" "$release" || return 1
  probe_slot "$candidate" "$release" || return 1
  # Persist the complete recovery record before changing either routing or metadata.
  journal=$(mktemp -d "$STATE/prepare.XXXXXXXX") || return 1
  before="$journal/before.caddy"; next="$journal/after.caddy"
  docker exec "$CADDY_CONTAINER" cat "$SITE" > "$before" || return 1
  [[ $(grep -Fc "reverse_proxy $(slot_host "$active"):80" "$before") == 1 ]] || return 1
  # The persistent edge cache also serves new chunks if the first deployment must
  # return to the legacy frontend. Both snapshots retain this independent asset route.
  if ! grep -Fq 'root * /data/portal-financeiro-assets' "$before"; then
    awk 'NR==1 { print; print "    handle_path /assets/* {\n        root * /data/portal-financeiro-assets\n        header Cache-Control \"public, max-age=31536000, immutable\"\n        file_server\n    }"; next } { print }' "$before" > "$before.tmp" && mv -- "$before.tmp" "$before" || return 1
  fi
  sed "s/reverse_proxy $(slot_host "$active"):80/reverse_proxy $(slot_host "$candidate"):80/" "$before" > "$next" || return 1
  printf '%s\n' "$active" > "$journal/old-slot" || return 1
  printf '%s\n' "$current" > "$journal/old-release" || return 1
  cat "$ROOT/previous-release" > "$journal/previous-release" 2>/dev/null || : > "$journal/previous-release"
  cat "$STATE/previous-slot" > "$journal/previous-slot" 2>/dev/null || : > "$journal/previous-slot"
  mv -- "$journal" "$STATE/transition" || return 1
  write_site "$STATE/transition/after.caddy" && reload_site || return 1
  for attempt in 1 2 3; do probe_public "$release" || return 1; sleep 2; done
  write_value "$ROOT/previous-release" "$current" &&
    write_value "$STATE/previous-slot" "$active" &&
    write_value "$ROOT/current-release" "$release" &&
    write_value "$STATE/$candidate-release" "$release" &&
    write_value "$RUNTIME/active-slot" "$candidate" 644 &&
    write_value "$STATE/promoted-at" "$(date -u +%s)" || return 1
  rm -r -- "$STATE/transition" || return 1
  echo "Traffic promoted to $candidate. Previous application retained for rollback."
}

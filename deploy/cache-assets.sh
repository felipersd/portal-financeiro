#!/usr/bin/env bash
set -Eeuo pipefail
CADDY=${1:?Caddy container required}
FRONTEND=${2:?Frontend image required}
stage=$(docker exec "$CADDY" mktemp -d /data/portal-financeiro-assets-staging.XXXXXXXX)
[[ "$stage" =~ ^/data/portal-financeiro-assets-staging\.[a-zA-Z0-9]+$ ]] || exit 1
cleanup() { docker exec "$CADDY" rm -rf -- "$stage" > /dev/null; }
trap cleanup EXIT
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --entrypoint sh "$FRONTEND" \
  -c 'tar -C /usr/share/nginx/html/assets -cf - .' | docker exec -i "$CADDY" tar -xf - -C "$stage"
docker exec "$CADDY" sh -c '
  set -eu
  mkdir -p /data/portal-financeiro-assets
  chmod 755 /data/portal-financeiro-assets
  for asset in "$1"/*; do
    test -f "$asset" && test ! -L "$asset"
    destination="/data/portal-financeiro-assets/${asset##*/}"
    if test ! -e "$destination"; then
      chmod 644 "$asset"
      mv "$asset" "$destination"
    fi
  done
' _ "$stage"

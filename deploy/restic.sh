#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/srv/portal-financeiro
# The R2 credential permits the VPS IPv4 only. Docker's IPv4 bridge avoids
# the host preferring IPv6 without changing the host or application networks.
[[ $(docker network inspect bridge --format '{{.EnableIPv6}}') == false ]] || {
  echo 'Backup requires an IPv4-only Docker bridge.' >&2; exit 1;
}
exec docker run --rm -i --network bridge --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true --memory 512m --cpus 1 \
  --user "$(id -u):$(id -g)" --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --env-file "$ROOT/secrets/restic.env" \
  --mount "type=bind,src=$ROOT/secrets/restic_password,dst=$ROOT/secrets/restic_password,readonly" \
  restic/restic@sha256:39d9072fb5651c80d75c7a811612eb60b4c06b32ffe87c2e9f3c7222e1797e76 \
  --no-cache "$@"

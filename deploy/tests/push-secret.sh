#!/usr/bin/env bash
set -Eeuo pipefail
IMAGE=${1:?Built finance image required}
fixture=$(mktemp -d)
cleanup() { rm -rf -- "$fixture"; }
trap cleanup EXIT
chmod 700 "$fixture"
key="$fixture/vapid_keys"
runtime_uid=$(docker run --rm --entrypoint id "$IMAGE" -u)
runtime_gid=$(docker run --rm --entrypoint id "$IMAGE" -g)
# GitHub's runner and the production node image deliberately exercise different UIDs.
[[ $(id -u) != "$runtime_uid" ]] || { echo 'Run this regression with a host UID different from the image USER.' >&2; exit 1; }
bash deploy/prepare-push-secret.sh "$IMAGE" "$key"
before=$(sha256sum "$key")
[[ $(stat -c %a "$key") == 640 && $(stat -c %g "$key") == "$runtime_gid" && $(stat -c %u "$key") == "$(id -u)" ]]

# Reproduce the exact 1.7.0 permissions failure, then repair without changing keys.
chmod 600 "$key"
if docker run --rm --network none --read-only --cap-drop ALL --mount "type=bind,src=$key,dst=/run/key,readonly" --entrypoint node "$IMAGE" -e 'require("fs").accessSync("/run/key",require("fs").constants.R_OK)' > /dev/null 2>&1; then
  echo 'Regression fixture should be unreadable by the runtime user.' >&2
  exit 1
fi
bash deploy/prepare-push-secret.sh "$IMAGE" "$key"
[[ $(sha256sum "$key") == "$before" ]]
chmod 750 "$fixture"
if bash deploy/prepare-push-secret.sh "$IMAGE" "$key" > /dev/null 2>&1; then
  echo 'Insecure host directory should be rejected.' >&2
  exit 1
fi
chmod 700 "$fixture"
printf 'invalid-json' > "$key"
if bash deploy/prepare-push-secret.sh "$IMAGE" "$key" > /dev/null 2>&1; then
  echo 'Invalid keys should be rejected before migrations.' >&2
  exit 1
fi
echo 'Push secret permissions, stable identity and validation passed.'

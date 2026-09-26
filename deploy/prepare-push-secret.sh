#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
IMAGE=${1:?Finance image required}
KEY_FILE=${2:?Absolute VAPID secret path required}
[[ "$KEY_FILE" == /* && "$KEY_FILE" != *$'\n'* ]] || exit 1
SECRET_DIR=$(dirname -- "$KEY_FILE")
DEPLOY_UID=$(id -u)
[[ -d "$SECRET_DIR" && ! -L "$SECRET_DIR" && $(stat -c %a "$SECRET_DIR") == 700 && $(stat -c %u "$SECRET_DIR") == "$DEPLOY_UID" ]] || {
  echo 'Push secret directory must be private (0700) and owned by the deployment user.' >&2
  exit 1
}
[[ ! -L "$KEY_FILE" && ( ! -e "$KEY_FILE" || -f "$KEY_FILE" ) ]] || exit 1
DOCKER=(docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges)
RUNTIME_GID=$("${DOCKER[@]}" --entrypoint id "$IMAGE" -g)
[[ "$RUNTIME_GID" =~ ^[0-9]+$ ]] || exit 1
temporary=''
cleanup() { [[ -z "$temporary" ]] || rm -f -- "$temporary"; }
trap cleanup EXIT

# Generate once. Existing keys must survive retries so browser subscriptions stay valid.
if [[ ! -s "$KEY_FILE" ]]; then
  temporary=$(mktemp "$SECRET_DIR/.vapid.XXXXXX")
  "${DOCKER[@]}" --entrypoint node "$IMAGE" -e 'process.stdout.write(JSON.stringify(require("web-push").generateVAPIDKeys()))' > "$temporary"
  mv -- "$temporary" "$KEY_FILE"
  temporary=''
fi
[[ $(stat -c %u "$KEY_FILE") == "$DEPLOY_UID" ]] || {
  echo 'Push secret must remain owned by the deployment user.' >&2
  exit 1
}

# Compose bind-mounts file secrets without remapping ownership. The host deploy UID
# and the image's node UID may differ. Keep the host owner and grant only the runtime
# group read access; the enclosing host directory remains private.
# This helper owns the file and belongs to the target group, so no root/capability is needed.
"${DOCKER[@]}" --user "$DEPLOY_UID:$RUNTIME_GID" \
  --mount "type=bind,src=$KEY_FILE,dst=/run/vapid_keys" --entrypoint node "$IMAGE" \
  -e 'const fs=require("fs"),p="/run/vapid_keys";fs.chownSync(p,process.getuid(),process.getgid());fs.chmodSync(p,0o640)'

# Validate with the image's actual USER and a read-only mount before any migration.
"${DOCKER[@]}" --mount "type=bind,src=$KEY_FILE,dst=/run/vapid_keys,readonly" --entrypoint node "$IMAGE" \
  -e 'try { const k=JSON.parse(require("fs").readFileSync("/run/vapid_keys","utf8")); require("web-push").setVapidDetails("https://portalfinanceiro.net",k.publicKey,k.privateKey); } catch { console.error("Runtime user cannot read or validate the push secret."); process.exit(1); }'
echo 'Push secret is ready for the runtime user.'

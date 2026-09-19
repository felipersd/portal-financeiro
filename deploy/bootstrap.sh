#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
KEY_FILE=${1:?Path to deployment public key required}
ROOT=/srv/portal-financeiro
id portal >/dev/null 2>&1 || useradd --create-home --shell /bin/bash portal
usermod -aG docker portal
install -d -m 700 -o portal -g portal /home/portal/.ssh
KEY=$(cat "$KEY_FILE")
[[ "$KEY" == ssh-ed25519\ * ]] || exit 1
AUTHORIZED=/home/portal/.ssh/authorized_keys
touch "$AUTHORIZED"
if ! grep -Fq "$KEY" "$AUTHORIZED"; then
  printf 'restrict %s\n' "$KEY" >> "$AUTHORIZED"
fi
chown portal:portal "$AUTHORIZED"
chmod 600 "$AUTHORIZED"
install -d -m 750 -o portal -g portal "$ROOT" "$ROOT/releases" "$ROOT/backups"
install -d -m 700 -o portal -g portal "$ROOT/secrets"
echo 'Portal deployment directories ready; no existing application changed.'

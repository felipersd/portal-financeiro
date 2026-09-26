#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/../rollback-compatibility.sh"
fixture=$(mktemp -d)
trap 'rm -f -- "$fixture/sharing-contract-version"; rmdir -- "$fixture"' EXIT
database_state() { printf '%s\n' "$schema_state"; }
database_unavailable() { return 1; }
schema_state=0
assert_rollback_compatible "$fixture" database_state
schema_state=2
if assert_rollback_compatible "$fixture" database_state; then exit 1; fi
schema_state=unexpected
if assert_rollback_compatible "$fixture" database_state; then exit 1; fi
if assert_rollback_compatible "$fixture" database_unavailable; then exit 1; fi
printf '3\n' > "$fixture/sharing-contract-version"
assert_rollback_compatible "$fixture" database_unavailable
printf '2\n' > "$fixture/sharing-contract-version"
schema_state=2
assert_rollback_compatible "$fixture" database_state
schema_state=3
if assert_rollback_compatible "$fixture" database_state; then exit 1; fi
echo 'Rollback compatibility checks passed.'

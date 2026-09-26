#!/usr/bin/env bash
# Use the current release's guard before starting an older application.
assert_rollback_compatible() {
  local target=$1 schema_present
  shift
  if [[ -f "$target/sharing-contract-version" ]] && [[ $(cat "$target/sharing-contract-version") == 3 ]]; then
    return 0
  fi
  if ! schema_present=$("$@" exec -T db psql -X -U portal -d finance_db -Atqc "SELECT CASE WHEN to_regclass('finance.\"Tag\"') IS NOT NULL THEN '3' WHEN to_regclass('finance.\"ExpenseShare\"') IS NOT NULL THEN '2' ELSE '0' END"); then
    echo 'Cannot verify rollback compatibility. Restore aborted.' >&2
    return 1
  fi
  if [[ "$schema_present" == 2 && -f "$target/sharing-contract-version" && $(cat "$target/sharing-contract-version") == 2 ]]; then return 0; fi
  if [[ "$schema_present" != 0 ]]; then
    echo 'Rollback blocked: this database requires an application that enforces sharing consent. Deploy a compatible correction.' >&2
    return 1
  fi
}

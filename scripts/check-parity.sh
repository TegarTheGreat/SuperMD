#!/usr/bin/env bash
# Thin wrapper kept for CI and muscle memory; the check itself is portable Node.
set -euo pipefail
exec node "$(dirname "$0")/check-parity.mjs"

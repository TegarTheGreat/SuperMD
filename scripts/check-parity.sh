#!/usr/bin/env bash
# Fails if en/ and id/ do not contain the exact same set of .md file paths.
set -euo pipefail
cd "$(dirname "$0")/.."

en_list=$(cd en && find . -type f -name '*.md' | sort)
id_list=$(cd id && find . -type f -name '*.md' | sort)

if diff_out=$(diff <(echo "$en_list") <(echo "$id_list")); then
  count=$(echo "$en_list" | wc -l)
  echo "Parity OK: $count files mirrored in en/ and id/."
else
  echo "PARITY FAILURE — the trees differ (< only in en/, > only in id/):"
  echo "$diff_out"
  exit 1
fi

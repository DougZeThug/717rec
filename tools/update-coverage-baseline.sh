#!/usr/bin/env bash
set -euo pipefail

BASELINE_FILE="coverage-baseline.txt"
SUMMARY_HEADER="% Coverage report from v8"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

if ! npm run test:coverage >"$TMP_FILE" 2>&1; then
  echo "Error: coverage command failed. Keeping existing ${BASELINE_FILE} unchanged." >&2
  exit 1
fi

if [[ ! -s "$TMP_FILE" ]]; then
  echo "Error: coverage output file is empty. Keeping existing ${BASELINE_FILE} unchanged." >&2
  exit 1
fi

if ! grep -Fq "$SUMMARY_HEADER" "$TMP_FILE"; then
  echo "Error: coverage summary header not found in output. Keeping existing ${BASELINE_FILE} unchanged." >&2
  exit 1
fi

mv "$TMP_FILE" "$BASELINE_FILE"
trap - EXIT

echo "Updated ${BASELINE_FILE} from successful coverage run."

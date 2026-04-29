#!/usr/bin/env bash
set -euo pipefail

TIMEOUT_DURATION="${COVERAGE_TRIAGE_TIMEOUT:-15m}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
LOG_DIR="${COVERAGE_TRIAGE_LOG_DIR:-logs/coverage-triage}"
LOG_FILE="${LOG_DIR}/coverage-triage-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

COVERAGE_CMD=(
  env CI=true
  vitest run
  --coverage
  --reporter=verbose
  --maxWorkers=1
  --pool=forks
  --fileParallelism=false
)

printf 'coverage-triage start: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee "$LOG_FILE"
printf 'coverage-triage timeout: %s\n' "$TIMEOUT_DURATION" | tee -a "$LOG_FILE"
printf 'coverage-triage command: timeout %s %s\n' "$TIMEOUT_DURATION" "${COVERAGE_CMD[*]}" | tee -a "$LOG_FILE"

LAST_COMPLETED_SUITE="(none recorded)"
START_EPOCH="$(date +%s)"

set +e
(
  timeout "$TIMEOUT_DURATION" "${COVERAGE_CMD[@]}" 2>&1 \
    | while IFS= read -r line; do
        printf '%s\n' "$line" | tee -a "$LOG_FILE"

        if [[ "$line" =~ ^[[:space:]]*[[:graph:]]*[[:space:]]+(.+\.(test|spec)\.(ts|tsx|js|jsx))([[:space:]]|$) ]]; then
          LAST_COMPLETED_SUITE="${BASH_REMATCH[1]}"
        fi
      done

  exit "${PIPESTATUS[0]}"
)
EXIT_CODE=$?
set -e

END_EPOCH="$(date +%s)"
DURATION_SECONDS="$((END_EPOCH - START_EPOCH))"

printf 'coverage-triage last-completed-suite: %s\n' "$LAST_COMPLETED_SUITE" | tee -a "$LOG_FILE"
printf 'coverage-triage exit-code: %s\n' "$EXIT_CODE" | tee -a "$LOG_FILE"
printf 'coverage-triage duration-seconds: %s\n' "$DURATION_SECONDS" | tee -a "$LOG_FILE"
printf 'coverage-triage end: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee -a "$LOG_FILE"
printf 'coverage-triage log-file: %s\n' "$LOG_FILE"

exit "$EXIT_CODE"

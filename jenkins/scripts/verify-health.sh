#!/usr/bin/env bash
# ==============================================================================
# MEDORA — Synthetic Health Verification Script
# ==============================================================================
set -eo pipefail

TARGET_HOST="${1:-http://localhost:8000}"
MAX_RETRIES=10
DELAY_SECONDS=3

echo ">> Probing Health Endpoints at: $TARGET_HOST"

count=0
until [ $count -ge $MAX_RETRIES ]
do
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_HOST/health" || true)
    READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_HOST/ready" || true)

    if [ "$HEALTH_STATUS" == "200" ] && [ "$READY_STATUS" == "200" ]; then
        echo ">> Synthetic Probe Passed: /health (HTTP 200) and /ready (HTTP 200)"
        exit 0
    fi

    echo ">> Probe returned (Health: $HEALTH_STATUS, Ready: $READY_STATUS). Retrying in ${DELAY_SECONDS}s... ($((count+1))/$MAX_RETRIES)"
    count=$((count+1))
    sleep $DELAY_SECONDS
done

echo "!! ERROR: Target application at $TARGET_HOST failed health probes after $MAX_RETRIES attempts."
exit 1

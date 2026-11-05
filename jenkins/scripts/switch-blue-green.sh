
#!/usr/bin/env bash
# MEDORA - Safe Blue-Green Traffic Cutover

set -Eeuo pipefail

NAMESPACE="${K8S_NAMESPACE:-medora}"
BACKEND_SVC="medora-backend-svc"
FRONTEND_SVC="medora-frontend-svc"
TIMEOUT_SECONDS=120

KUBECTL=(kubectl)

echo "=============================================="
echo " MEDORA BLUE-GREEN CUTOVER"
echo " Namespace: $NAMESPACE"
echo "=============================================="


# Discover current production environment
CURRENT_ENV=$("${KUBECTL[@]}" get svc "$BACKEND_SVC" \
    -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}')

FRONTEND_CURRENT=$("${KUBECTL[@]}" get svc "$FRONTEND_SVC" \
    -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}')

if [[ "$CURRENT_ENV" != "$FRONTEND_CURRENT" ]]; then
    echo "ERROR: Backend and frontend environments differ."
    exit 1
fi

if [[ "$CURRENT_ENV" != "blue" && "$CURRENT_ENV" != "green" ]]; then
    echo "ERROR: Unknown active environment: $CURRENT_ENV"
    exit 1
fi

if [[ "$CURRENT_ENV" == "blue" ]]; then
    TARGET_ENV="green"
else
    TARGET_ENV="blue"
fi

echo "Current environment: $CURRENT_ENV"
echo "Candidate environment: $TARGET_ENV"

# Verify candidate deployments
for COMPONENT in backend frontend; do
    DEPLOYMENT="medora-${COMPONENT}-${TARGET_ENV}"

    echo "Checking $DEPLOYMENT..."

    "${KUBECTL[@]}" rollout status \
        "deployment/$DEPLOYMENT" \
        -n "$NAMESPACE" \
        --timeout="${TIMEOUT_SECONDS}s"

    READY=$("${KUBECTL[@]}" get deployment "$DEPLOYMENT" \
        -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}')

    DESIRED=$("${KUBECTL[@]}" get deployment "$DEPLOYMENT" \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}')

    if [[ "$READY" != "$DESIRED" ]]; then
        echo "ERROR: $DEPLOYMENT is not fully ready."
        exit 1
    fi
done
if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo "DRY RUN: All candidate checks passed."
    echo "DRY RUN: Would switch traffic from $CURRENT_ENV to $TARGET_ENV."
    echo "DRY RUN: No production Services were changed."
    exit 0
fi
echo "Switching production traffic to $TARGET_ENV..."

rollback() {
    echo "ERROR: Cutover failed. Restoring $CURRENT_ENV..."

    "${KUBECTL[@]}" patch svc "$BACKEND_SVC" \
        -n "$NAMESPACE" \
        --type=merge \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$CURRENT_ENV\"}}}" || true

    "${KUBECTL[@]}" patch svc "$FRONTEND_SVC" \
        -n "$NAMESPACE" \
        --type=merge \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$CURRENT_ENV\"}}}" || true
}

if ! "${KUBECTL[@]}" patch svc "$BACKEND_SVC" \
    -n "$NAMESPACE" --type=merge \
    -p "{\"spec\":{\"selector\":{\"environment\":\"$TARGET_ENV\"}}}"; then
    rollback
    exit 1
fi

if ! "${KUBECTL[@]}" patch svc "$FRONTEND_SVC" \
    -n "$NAMESPACE" --type=merge \
    -p "{\"spec\":{\"selector\":{\"environment\":\"$TARGET_ENV\"}}}"; then
    rollback
    exit 1
fi

# Verify both selectors after switching
BACKEND_ACTIVE=$("${KUBECTL[@]}" get svc "$BACKEND_SVC" \
    -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}')

FRONTEND_ACTIVE=$("${KUBECTL[@]}" get svc "$FRONTEND_SVC" \
    -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}')

if [[ "$BACKEND_ACTIVE" != "$TARGET_ENV" || \
      "$FRONTEND_ACTIVE" != "$TARGET_ENV" ]]; then
    rollback
    exit 1
fi

echo "=============================================="
echo " CUTOVER SUCCESSFUL"
echo " Production environment: $TARGET_ENV"
echo " Previous environment: $CURRENT_ENV"
echo "=============================================="

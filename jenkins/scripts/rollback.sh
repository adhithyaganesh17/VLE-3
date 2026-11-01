#!/usr/bin/env bash
# ==============================================================================
# MEDORA — Instant Blue-Green Rollback Script
# ==============================================================================
set -eo pipefail

NAMESPACE="${K8S_NAMESPACE:-medora}"
BACKEND_SVC="medora-backend-svc"
FRONTEND_SVC="medora-frontend-svc"

echo "----------------------------------------------------------------------"
echo " [ROLLBACK] Reverting MEDORA Traffic to Previous Healthy Environment"
echo "----------------------------------------------------------------------"

if command -v kubectl &> /dev/null && kubectl get svc "$BACKEND_SVC" -n "$NAMESPACE" &> /dev/null; then
    CURRENT_ENV=$(kubectl get svc "$BACKEND_SVC" -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}')
    if [ "$CURRENT_ENV" == "blue" ]; then
        ROLLBACK_ENV="green"
    else
        ROLLBACK_ENV="blue"
    fi

    echo ">> Reverting selector from $CURRENT_ENV to $ROLLBACK_ENV..."
    kubectl patch svc "$BACKEND_SVC" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"environment\":\"$ROLLBACK_ENV\"}}}"
    kubectl patch svc "$FRONTEND_SVC" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"environment\":\"$ROLLBACK_ENV\"}}}"
    echo ">> Rollback successful: Traffic restored to [ ${ROLLBACK_ENV^^} ]"
else
    echo ">> Calling simulated API rollback..."
    curl -s -X POST "http://localhost:8000/api/devops/switch-env?target_environment=blue" || true
    echo ">> Rollback complete."
fi

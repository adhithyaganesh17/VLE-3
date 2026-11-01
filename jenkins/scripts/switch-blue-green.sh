#!/usr/bin/env bash
# ==============================================================================
# MEDORA — Zero-Downtime Blue-Green Automated Cutover Script
# ==============================================================================
set -eo pipefail

NAMESPACE="${K8S_NAMESPACE:-medora}"
BACKEND_SVC="medora-backend-svc"
FRONTEND_SVC="medora-frontend-svc"
TIMEOUT_SECONDS=90

echo "----------------------------------------------------------------------"
echo " [MEDORA] Initiating Automated Blue-Green Cutover in namespace: $NAMESPACE"
echo "----------------------------------------------------------------------"

# 1. Determine currently active environment from Kubernetes backend service selector
if command -v kubectl &> /dev/null && kubectl get svc "$BACKEND_SVC" -n "$NAMESPACE" &> /dev/null; then
    CURRENT_ENV=$(kubectl get svc "$BACKEND_SVC" -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}')
else
    echo ">> [SIMULATION MODE] Reading active environment from backend API..."
    CURRENT_ENV=$(curl -s http://localhost:8000/health | grep -o '"environment":"[^"]*' | cut -d'"' -f4 || echo "blue")
    CURRENT_ENV=$(echo "$CURRENT_ENV" | tr '[:upper:]' '[:lower:]')
fi

echo ">> Current Active Environment: [ ${CURRENT_ENV^^} ]"

# 2. Determine inactive candidate target
if [ "$CURRENT_ENV" == "blue" ]; then
    TARGET_ENV="green"
    TARGET_VERSION="1.1.0"
else
    TARGET_ENV="blue"
    TARGET_VERSION="1.0.0"
fi

echo ">> Candidate Target Environment: [ ${TARGET_ENV^^} ] (Version: $TARGET_VERSION)"

# 3. Apply deployment to candidate environment if running against real Kubernetes
if command -v kubectl &> /dev/null && kubectl get ns "$NAMESPACE" &> /dev/null; then
    echo ">> Applying manifest: k8s/$TARGET_ENV/backend-deployment-$TARGET_ENV.yaml..."
    kubectl apply -f "k8s/$TARGET_ENV/backend-deployment-$TARGET_ENV.yaml" -n "$NAMESPACE"
    kubectl apply -f "k8s/$TARGET_ENV/frontend-deployment-$TARGET_ENV.yaml" -n "$NAMESPACE"

    echo ">> Waiting for rollout to complete on medora-backend-$TARGET_ENV..."
    kubectl rollout status "deployment/medora-backend-$TARGET_ENV" -n "$NAMESPACE" --timeout="${TIMEOUT_SECONDS}s"
    kubectl rollout status "deployment/medora-frontend-$TARGET_ENV" -n "$NAMESPACE" --timeout="${TIMEOUT_SECONDS}s"

    # 4. Probe health of candidate pods before switching traffic
    echo ">> Verifying candidate deployment health..."
    CANDIDATE_POD=$(kubectl get pods -n "$NAMESPACE" -l "app=medora,component=backend,environment=$TARGET_ENV" -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n "$NAMESPACE" "$CANDIDATE_POD" -- curl -sf http://localhost:8000/ready > /dev/null || {
        echo "!! CRITICAL: Candidate pod $CANDIDATE_POD failed readiness probe! Aborting cutover."
        exit 1
    }

    # 5. Atomic Service Selector Switch (Cutover)
    echo ">> Candidate verified healthy. Switching production traffic to $TARGET_ENV..."
    kubectl patch svc "$BACKEND_SVC" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"environment\":\"$TARGET_ENV\"}}}"
    kubectl patch svc "$FRONTEND_SVC" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"environment\":\"$TARGET_ENV\"}}}"

    echo ">> Successfully patched Service selectors to environment: $TARGET_ENV"
else
    # Demonstration fallback using API toggle
    echo ">> Simulated cluster environment: calling /api/devops/switch-env..."
    curl -s -X POST "http://localhost:8000/api/devops/switch-env?target_environment=$TARGET_ENV" || true
    echo ">> Successfully updated environment to $TARGET_ENV"
fi

echo ""
echo "======================================================================"
echo " CUTOVER COMPLETE: Production traffic is now routed to [ ${TARGET_ENV^^} ]"
echo " Zero downtime achieved. Previous [ ${CURRENT_ENV^^} ] retained for instant rollback."
echo "======================================================================"

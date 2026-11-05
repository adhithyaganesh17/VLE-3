#!/bin/bash
set -Eeuo pipefail

export KUBECONFIG=/var/lib/jenkins/.kube/config
NAMESPACE=medora

echo "========== MEDORA CANDIDATE DEPLOYMENT =========="

# Generate a unique image tag after Git checkout
GIT_SHORT=$(git rev-parse --short HEAD)
IMAGE_TAG="${BUILD_NUMBER}-${GIT_SHORT}"

echo "Build: ${BUILD_NUMBER}"
echo "Image tag: ${IMAGE_TAG}"

# Identify the live environment
ACTIVE_ENV=$(kubectl get service medora-backend-svc \
  -n "$NAMESPACE" \
  -o jsonpath='{.spec.selector.environment}')

if [[ "$ACTIVE_ENV" != "blue" && "$ACTIVE_ENV" != "green" ]]; then
    echo "ERROR: Cannot identify the active environment."
    exit 1
fi

# Deploy only to the inactive environment
if [[ "$ACTIVE_ENV" == "blue" ]]; then
    TARGET_ENV=green
else
    TARGET_ENV=blue
fi

echo "Production environment: $ACTIVE_ENV"
echo "Candidate environment: $TARGET_ENV"

# Import locally built Docker images into K3s
sudo /usr/local/bin/medora-import-images "$IMAGE_TAG" "$IMAGE_TAG"

# Update candidate deployments
kubectl set image deployment/medora-backend-"$TARGET_ENV" \
  backend=medora-backend:"$IMAGE_TAG" -n "$NAMESPACE"

kubectl set env deployment/medora-backend-"$TARGET_ENV" \
  APP_ENV="$TARGET_ENV" APP_VERSION="$IMAGE_TAG" -n "$NAMESPACE"

kubectl set image deployment/medora-frontend-"$TARGET_ENV" \
  frontend=medora-frontend:"$IMAGE_TAG" -n "$NAMESPACE"

# Wait for successful rollouts
kubectl rollout status deployment/medora-backend-"$TARGET_ENV" \
  -n "$NAMESPACE" --timeout=180s

kubectl rollout status deployment/medora-frontend-"$TARGET_ENV" \
  -n "$NAMESPACE" --timeout=180s

# Save deployment details for subsequent pipeline stages
echo "$TARGET_ENV" > .medora-target-env
echo "$IMAGE_TAG" > .medora-image-tag

echo "Candidate deployment completed."
echo "Production traffic remains on $ACTIVE_ENV."

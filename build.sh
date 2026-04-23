#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-chamine}"
FRONTEND_STABLE_TAG="${FRONTEND_STABLE_TAG:-stable-local}"
FRONTEND_CANARY_TAG="${FRONTEND_CANARY_TAG:-canary-local}"
BACKEND_TAG="${BACKEND_TAG:-local}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pushd "$SCRIPT_DIR/app/frontend" >/dev/null
docker build \
    --build-arg VITE_APP_VARIANT=stable \
    --build-arg VITE_API_URL=/api \
    -t "$REGISTRY/taskmanager-frontend:$FRONTEND_STABLE_TAG" \
    .

docker build \
    --build-arg VITE_APP_VARIANT=canary \
    --build-arg VITE_API_URL=/api \
    -t "$REGISTRY/taskmanager-frontend:$FRONTEND_CANARY_TAG" \
    .
popd >/dev/null

pushd "$SCRIPT_DIR/app/backend" >/dev/null
docker build \
    -t "$REGISTRY/taskmanager-backend:$BACKEND_TAG" \
    .
popd >/dev/null

docker images | grep taskmanager
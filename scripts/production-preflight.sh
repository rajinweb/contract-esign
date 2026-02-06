#!/usr/bin/env bash
set -e

echo "==> Production preflight"

REQUIRED_VARS=(
  "MONGODB_URI"
  "JWT_SECRET"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "NEXT_PUBLIC_BASE_URL"
  "ACCESS_AWS_KEY_ID"
  "SECRET_AWS_ACCESS_KEY"
  "REGION_AWS"
  "S3_BUCKET_NAME"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASS"
  "SMTP_FROM"
)

missing=0
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "Missing env var: ${var}"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo "One or more required env vars are missing."
  exit 1
fi

if [[ "${SKIP_TESTS}" != "1" ]]; then
  echo "==> Running unit tests"
  npm run test:unit
fi

if [[ "${SKIP_INTEGRATION}" != "1" ]]; then
  if [[ -z "${TEST_MONGODB_URI}" ]]; then
    echo "Skipping integration tests (TEST_MONGODB_URI not set)."
  else
    echo "==> Running integration tests"
    npm run test:integration
  fi
fi

if [[ "${SKIP_E2E}" != "1" ]]; then
  echo "==> Running E2E tests"
  npm run test:e2e
fi

echo "==> Running production build"
npm run build

echo "==> Preflight complete"

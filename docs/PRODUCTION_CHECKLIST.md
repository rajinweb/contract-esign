# Production Checklist

This checklist is intended to be a repeatable, safe gate before deploying the e-sign application.

**Build & Tests**
- Run unit tests: `npm run test:unit`
- Run integration tests (requires `TEST_MONGODB_URI`): `npm run test:integration`
- Run E2E tests (Playwright): `npm run test:e2e`
- Run production build: `npm run build`

**Environment & Secrets**
- Confirm all required env vars are set in the deployment environment:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `NEXT_PUBLIC_BASE_URL`
  - `ACCESS_AWS_KEY_ID`
  - `SECRET_AWS_ACCESS_KEY`
  - `REGION_AWS`
  - `S3_BUCKET_NAME`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
- Confirm no real secrets are committed to the repo (use secret scanning in CI).
- Confirm production values differ from local `.env`.

**Storage & File Integrity**
- Verify S3 credentials and bucket access.
- Confirm objects are written with immutable keys and expected ACLs.
- Validate PDF hashes on a sampled signed document.

**Email Delivery**
- Verify SMTP credentials work in the deployment environment.
- Send a test signing email and confirm delivery.
- Confirm bounce/failed delivery handling is visible in logs or alerts.

**Audit & Compliance**
- Confirm signed documents are immutable and locked.
- Confirm completed documents cannot be reopened or altered.
- Confirm audit trail and signing events persist and are exported correctly.
- Confirm retention policy is documented and enforced.

**Data Safety**
- Verify backups for MongoDB are enabled and tested.
- Verify retention purge policy is documented and scheduled.
- Confirm the retention purge is limited to compliance-approved windows.

**Security**
- Validate JWT secret length and rotation policy.
- Ensure cookies are `httpOnly` and `secure` in production.
- Confirm signing tokens are never returned to clients.
- Verify soft-deleted completed documents remain immutable.

**Observability**
- Confirm structured error logs are enabled.
- Confirm alerts exist for signing failures and email delivery failures.
- Confirm request tracing or correlation IDs are present in logs.

**Release & Rollback**
- Tag the release and record the build artifact.
- Prepare a rollback plan (previous build + DB snapshot).
- Verify a rollback does not break document lineage or hashes.

If you want, add this checklist to CI as a required gate before deployment.

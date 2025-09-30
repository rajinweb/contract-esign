fix-document-filepaths migration

This script attempts to fix existing Document records which have missing `versions[].filePath` or `versions[].fileName`.

Usage:

# Dry run (no DB changes, only reports candidates):
node ./scripts/fix-document-filepaths.ts

# Apply changes (will update DB):
node ./scripts/fix-document-filepaths.ts --apply

Notes:
- The script uses the same `MONGODB_URI` environment variable as the app.
- It looks in the `uploads/<userId>` directory for candidate files.
- It tries heuristics in order: original filename, deterministic `<docId>_v<N>.pdf`, then any file in the user's uploads folder that matches size/hash.
- Run first in dry-run mode and review output before applying.

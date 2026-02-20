const mongoose = require('mongoose');

function pickEarliestDate(values) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0] || null;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined.');
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('documents');

  const cursor = collection.find({
    versions: { $elemMatch: { label: 'prepared' } },
    signingEvents: { $elemMatch: { action: 'sent' } },
  });

  let processed = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;

    const versions = Array.isArray(doc.versions) ? doc.versions : [];
    const signingEvents = Array.isArray(doc.signingEvents) ? doc.signingEvents : [];

    const sentEvents = signingEvents.filter((event) => event?.action === 'sent' && event?.sentAt);
    if (sentEvents.length === 0) {
      processed += 1;
      continue;
    }

    let changed = false;

    for (const version of versions) {
      if (version?.label !== 'prepared') continue;
      if (version?.sentAt) continue;

      const matches = sentEvents.filter((event) => {
        if (typeof event?.baseVersion === 'number' && typeof version?.version === 'number') {
          return event.baseVersion === version.version;
        }
        if (typeof event?.targetVersion === 'number' && typeof version?.version === 'number') {
          return event.targetVersion === version.version;
        }
        if (typeof event?.version === 'number' && typeof version?.version === 'number') {
          return event.version === version.version;
        }
        return false;
      });

      const fallbackSentAt = pickEarliestDate(sentEvents.map((event) => event.sentAt));
      const resolvedSentAt = pickEarliestDate(matches.map((event) => event.sentAt)) || fallbackSentAt;

      if (resolvedSentAt) {
        version.sentAt = resolvedSentAt;
        changed = true;
      }
    }

    if (changed) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { versions } }
      );
      updated += 1;
    }

    processed += 1;
  }

  console.log(`[backfill-sent-at] Processed ${processed} documents. Updated ${updated}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[backfill-sent-at] Failed:', err);
  process.exit(1);
});

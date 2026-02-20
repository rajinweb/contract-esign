const mongoose = require('mongoose');
const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeSignedBy(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

const LOOPBACK_IPS = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', '0.0.0.0']);

function normalizeIp(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ip: undefined, ipUnavailableReason: 'unavailable' };
  }
  const cleaned = raw.split(',')[0]?.trim();
  if (!cleaned) {
    return { ip: undefined, ipUnavailableReason: 'unavailable' };
  }
  if (LOOPBACK_IPS.has(cleaned)) {
    return { ip: undefined, ipUnavailableReason: 'loopback' };
  }
  return { ip: cleaned };
}

function buildEventFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field) => {
      const fieldId = field?.id ?? field?._id;
      if (!fieldId) return null;
      const rawValue = field?.value ?? '';
      return {
        fieldId: String(fieldId),
        fieldHash: sha256(`${String(fieldId)}:${String(rawValue)}`),
      };
    })
    .filter(Boolean);
}

function parseOrderFromLabel(label) {
  if (!label || typeof label !== 'string') return null;
  const match = label.match(/signed_by_order_(\d+)/);
  if (!match) return null;
  const order = Number.parseInt(match[1], 10);
  return Number.isFinite(order) ? order : null;
}

function sortByVersionDesc(a, b) {
  return (b?.version || 0) - (a?.version || 0);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined.');
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('documents');

  const cursor = collection.find({
    'recipients.status': { $in: ['signed', 'approved'] }
  });

  let processed = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;

    const recipients = Array.isArray(doc.recipients) ? doc.recipients : [];
    const versions = Array.isArray(doc.versions) ? doc.versions : [];
    const signingEvents = Array.isArray(doc.signingEvents) ? doc.signingEvents : [];

    const signerIds = new Set(
      recipients
        .filter((r) => r?.role === 'signer' && r?.id)
        .map((r) => r.id)
    );

    let versionsUpdated = false;
    let recipientsUpdated = false;

    for (const version of versions) {
      if (version?.signedBy !== undefined) {
        const normalized = normalizeSignedBy(version.signedBy).filter((id) => signerIds.has(id));
        if (
          !Array.isArray(version.signedBy) ||
          version.signedBy.length !== normalized.length ||
          version.signedBy.some((value, index) => value !== normalized[index])
        ) {
          version.signedBy = normalized;
          versionsUpdated = true;
        }
      }

      if (version?.label === 'prepared' && Array.isArray(version.fields)) {
        let stripped = false;
        const sanitizedFields = version.fields.map((field) => {
          if (!field || typeof field !== 'object') return field;
          if (Object.prototype.hasOwnProperty.call(field, 'pageRect')) {
            stripped = true;
          }
          const { pageRect, ...rest } = field;
          void pageRect;
          return rest;
        });
        if (stripped) {
          version.fields = sanitizedFields;
          versionsUpdated = true;
        }
      } else if (version?.label && version.label !== 'prepared' && Array.isArray(version.fields) && version.fields.length > 0) {
        version.fields = [];
        versionsUpdated = true;
      }
    }

    // Backfill signedBy from legacy labels
    for (const version of versions) {
      const existingSignedBy = normalizeSignedBy(version?.signedBy);
      if (existingSignedBy.length > 0) continue;
      const order = parseOrderFromLabel(version?.label);
      if (!order) continue;
      const matchRecipient = recipients.find((r) => r.order === order && r.role === 'signer');
      if (matchRecipient?.id) {
        version.signedBy = [matchRecipient.id];
        versionsUpdated = true;
      }
    }

    for (const recipient of recipients) {
      if (recipient?.role !== 'signer') continue;
      if (recipient?.signedVersion == null || !recipient.id) continue;
      const matchVersion = versions.find((v) => v?.version === recipient.signedVersion);
      if (matchVersion) {
        const chain = normalizeSignedBy(matchVersion.signedBy);
        if (!chain.includes(recipient.id)) {
          chain.push(recipient.id);
          matchVersion.signedBy = chain;
          versionsUpdated = true;
        }
      }
    }

    for (const recipient of recipients) {
      if (recipient?.role !== 'signer') continue;
      if (recipient?.status !== 'signed') continue;
      if (recipient?.signedVersion != null) continue;
      const matchVersion = versions
        .filter((v) => normalizeSignedBy(v?.signedBy).includes(recipient.id))
        .sort(sortByVersionDesc)[0];
      if (matchVersion) {
        recipient.signedVersion = matchVersion.version;
        recipientsUpdated = true;
      }
    }

    const signedVersions = versions
      .filter((v) => typeof v?.label === 'string' && v.label.startsWith('signed') && typeof v?.version === 'number')
      .sort((a, b) => (a.version || 0) - (b.version || 0));

    const signersBySignedVersion = recipients
      .filter((r) => r?.role === 'signer' && r?.status === 'signed' && typeof r?.signedVersion === 'number')
      .sort((a, b) => (a.signedVersion || 0) - (b.signedVersion || 0));

    for (const version of signedVersions) {
      const signedByForVersion = signersBySignedVersion
        .filter((r) => (r.signedVersion || 0) <= version.version)
        .map((r) => r.id);
      const currentChain = normalizeSignedBy(version.signedBy).filter((id) => signerIds.has(id));
      if (
        signedByForVersion.length !== currentChain.length ||
        signedByForVersion.some((value, index) => value !== currentChain[index])
      ) {
        version.signedBy = signedByForVersion;
        versionsUpdated = true;
      }
    }

    for (const recipient of recipients) {
      if (!recipient?.network) continue;
      const { ip, ipUnavailableReason } = normalizeIp(recipient.network.ip);
      if (
        ip !== recipient.network.ip ||
        ipUnavailableReason !== recipient.network.ipUnavailableReason
      ) {
        recipient.network.ip = ip;
        recipient.network.ipUnavailableReason = ipUnavailableReason;
        recipientsUpdated = true;
      }
    }

    const eventsToAdd = [];
    const nowFallback = doc.updatedAt ? new Date(doc.updatedAt) : new Date();

    for (const recipient of recipients) {
      if (!['signed', 'approved'].includes(recipient.status)) continue;
      const action = recipient.status === 'approved' ? 'approved' : 'signed';
      const existingEvent = signingEvents.find(
        (e) => e.recipientId === recipient.id && e.action === action
      );
      if (existingEvent) continue;

      let signedVersion = versions
        .filter((v) => normalizeSignedBy(v?.signedBy).includes(recipient.id))
        .sort(sortByVersionDesc)[0];

      if (!signedVersion && recipient.signedVersion != null) {
        signedVersion = versions.find((v) => v?.version === recipient.signedVersion);
      }

      if (!signedVersion && action === 'signed') {
        console.warn(
          `[backfill] Missing signed version for recipient ${recipient.id} in document ${doc._id}`
        );
      }

      const eventAt = recipient.signedAt || recipient.approvedAt || nowFallback;
      const eventFields = buildEventFields(signedVersion?.fields);
      const fieldsHash = eventFields.length > 0 ? sha256(JSON.stringify(eventFields)) : undefined;
      const { ip, ipUnavailableReason } = normalizeIp(recipient?.network?.ip);

      eventsToAdd.push({
        recipientId: recipient.id,
        action,
        signedAt: eventAt,
        serverTimestamp: eventAt,
        baseVersion: signedVersion?.derivedFromVersion,
        version: signedVersion?.version,
        order: recipient.order,
        ip,
        ipUnavailableReason,
        userAgent: recipient?.device?.userAgent,
        client: {
          ip,
          userAgent: recipient?.device?.userAgent,
          deviceType: recipient?.device?.type,
          os: recipient?.device?.os,
          browser: recipient?.device?.browser,
        },
        geo: recipient?.location
          ? {
              latitude: recipient.location.latitude,
              longitude: recipient.location.longitude,
              accuracyMeters: recipient.location.accuracyMeters,
              city: recipient.location.city,
              state: recipient.location.state,
              country: recipient.location.country,
              capturedAt: recipient.location.capturedAt,
              source: 'recipient',
            }
          : undefined,
        consent: recipient?.consent
          ? {
              locationGranted: recipient.consent.locationGranted,
              grantedAt: recipient.consent.grantedAt,
              method: recipient.consent.method || 'other',
            }
          : undefined,
        fields: eventFields.length > 0 ? eventFields : undefined,
        fieldsHash,
        fieldsHashAlgo: fieldsHash ? 'SHA-256' : undefined,
      });
    }

    const hasSignedRecipients = recipients.some((r) => ['signed', 'approved'].includes(r.status));

    let completedAt = doc.completedAt ? new Date(doc.completedAt) : null;
    let finalizedAt = doc.finalizedAt ? new Date(doc.finalizedAt) : null;
    if (doc.status === 'completed' && !completedAt && hasSignedRecipients) {
      const lastEventAt = [...signingEvents, ...eventsToAdd]
        .map((e) => e?.signedAt)
        .filter(Boolean)
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      if (lastEventAt) {
        completedAt = lastEventAt;
        finalizedAt = lastEventAt;
      }
    }

    const updatePayload = {};
    const signedVersionValues = recipients
      .map((r) => (typeof r?.signedVersion === 'number' ? r.signedVersion : null))
      .filter((value) => value !== null);
    if (signedVersionValues.length > 0) {
      const maxSignedVersion = Math.max(...signedVersionValues);
      if (doc.currentVersion !== maxSignedVersion) {
        updatePayload.currentVersion = maxSignedVersion;
      }
    }
    if (eventsToAdd.length > 0) {
      updatePayload.signingEvents = [...signingEvents, ...eventsToAdd];
    }
    if (versionsUpdated) {
      updatePayload.versions = versions;
    }
    if (recipientsUpdated) {
      updatePayload.recipients = recipients;
    }
    if (doc.auditTrailVersion == null) {
      updatePayload.auditTrailVersion = 1;
    }
    if (completedAt && !doc.completedAt) {
      updatePayload.completedAt = completedAt;
    }
    if (finalizedAt && !doc.finalizedAt) {
      updatePayload.finalizedAt = finalizedAt;
    }
    if (Object.keys(updatePayload).length > 0) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: updatePayload }
      );
      updated += 1;
    }

    processed += 1;
  }

  console.log(`[backfill] Processed ${processed} documents. Updated ${updated}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[backfill] Failed:', err);
  process.exit(1);
});

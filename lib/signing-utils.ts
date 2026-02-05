type RecipientLike = {
  role?: string;
  status?: string;
  order?: number;
  signedVersion?: number | null;
  id?: string;
};

type VersionLike = {
  label?: string;
  version?: number;
  fields?: unknown;
  locked?: boolean;
  sentAt?: Date;
  expiresAt?: Date | string | null;
  storage?: {
    key?: string;
    region?: string;
    bucket?: string;
  };
  documentName?: string;
};

export const COMPLETED_RECIPIENT_STATUSES = new Set(['signed', 'approved']);

export function isRecipientComplete(recipient: RecipientLike): boolean {
  if (!recipient.status) return false;
  return COMPLETED_RECIPIENT_STATUSES.has(recipient.status);
}

export function getNextSequentialOrder(recipients: RecipientLike[]): number | null {
  const remainingOrders = recipients
    .filter((r) => r.role !== 'viewer')
    .filter((r) => !isRecipientComplete(r))
    .map((r) => r.order)
    .filter((order): order is number => typeof order === 'number' && !Number.isNaN(order));

  if (remainingOrders.length === 0) return null;
  return Math.min(...remainingOrders);
}

export function isRecipientTurn(recipient: RecipientLike, recipients: RecipientLike[]): boolean {
  const nextOrder = getNextSequentialOrder(recipients);
  if (nextOrder === null) return false;
  return typeof recipient.order === 'number' && recipient.order === nextOrder;
}

export function getLatestPreparedVersion<T extends VersionLike>(versions: T[]): T | null {
  const prepared = versions.filter(
    (v) => v.label === 'prepared' && typeof v.version === 'number'
  );
  if (prepared.length === 0) return null;
  prepared.sort((a, b) => (b.version as number) - (a.version as number));
  return prepared[0];
}

export function getLatestSignedVersion<T extends VersionLike>(versions: T[]): T | null {
  const signed = versions.filter(
    (v) => typeof v.version === 'number' && typeof v.label === 'string' && v.label.startsWith('signed')
  );
  if (signed.length === 0) return null;
  signed.sort((a, b) => (b.version as number) - (a.version as number));
  return signed[0];
}

export function normalizeSignedBy(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

export function buildSignedByChain(previous: unknown, recipientId: string): string[] {
  const chain = normalizeSignedBy(previous);
  if (!chain.includes(recipientId)) {
    chain.push(recipientId);
  }
  return chain;
}

export function buildSignedBySnapshot(recipients: RecipientLike[], versionNumber: number): string[] {
  const seen = new Set<string>();
  const ordered = recipients
    .filter((r) => r.role === 'signer' && r.status === 'signed')
    .filter((r) => typeof r.signedVersion === 'number' && r.signedVersion <= versionNumber)
    .sort((a, b) => {
      const aVersion = typeof a.signedVersion === 'number' ? a.signedVersion : Number.MAX_SAFE_INTEGER;
      const bVersion = typeof b.signedVersion === 'number' ? b.signedVersion : Number.MAX_SAFE_INTEGER;
      if (aVersion !== bVersion) return aVersion - bVersion;
      const aOrder = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aId = a.id ?? '';
      const bId = b.id ?? '';
      return aId.localeCompare(bId);
    });

  for (const recipient of ordered) {
    if (recipient.id && !seen.has(recipient.id)) {
      seen.add(recipient.id);
    }
  }

  return Array.from(seen);
}

export function normalizeIp(raw?: string | null): { ip?: string; ipUnavailableReason?: string } {
  if (!raw) {
    return { ip: undefined, ipUnavailableReason: 'unavailable' };
  }
  const cleaned = raw.split(',')[0]?.trim();
  if (!cleaned) {
    return { ip: undefined, ipUnavailableReason: 'unavailable' };
  }
  const loopbackValues = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', '0.0.0.0']);
  if (loopbackValues.has(cleaned)) {
    return { ip: undefined, ipUnavailableReason: 'loopback' };
  }
  return { ip: cleaned };
}

type RecipientContext = {
  device?: {
    type?: 'mobile' | 'desktop' | 'tablet';
    os?: string;
    browser?: string;
    userAgent?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    city?: string;
    state?: string;
    country?: string;
    capturedAt?: Date;
  };
  consent?: {
    locationGranted?: boolean;
    grantedAt?: Date;
    method?: 'system_prompt' | 'checkbox' | 'other';
  };
  network?: {
    ip?: string;
  };
};

function hasAnyValue(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((value) => value !== undefined && value !== null && value !== '');
}

export function buildEventClient(args: {
  ip?: string;
  userAgent?: string;
  recipient?: RecipientContext | null;
}) {
  const device = args.recipient?.device;
  const client = {
    ip: args.ip ?? args.recipient?.network?.ip,
    userAgent: args.userAgent ?? device?.userAgent,
    deviceType: device?.type,
    os: device?.os,
    browser: device?.browser,
  };
  return hasAnyValue(client) ? client : undefined;
}

export function buildEventGeo(recipient?: RecipientContext | null) {
  if (!recipient?.location) return undefined;
  const geo = {
    latitude: recipient.location.latitude,
    longitude: recipient.location.longitude,
    accuracyMeters: recipient.location.accuracyMeters,
    city: recipient.location.city,
    state: recipient.location.state,
    country: recipient.location.country,
    capturedAt: recipient.location.capturedAt,
    source: 'recipient',
  };
  return hasAnyValue(geo) ? geo : undefined;
}

export function buildEventConsent(recipient?: RecipientContext | null) {
  if (!recipient?.consent) return undefined;
  const consent = {
    locationGranted: recipient.consent.locationGranted,
    grantedAt: recipient.consent.grantedAt,
    method: recipient.consent.method ?? 'other',
  };
  return hasAnyValue(consent) ? consent : undefined;
}

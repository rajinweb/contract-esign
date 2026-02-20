import AuditLogModel from '@/models/AuditLog';

interface AuditEventInput {
  userId?: unknown;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

function normalizeUserId(userId: unknown): string | null {
  if (userId === null || userId === undefined) {
    return null;
  }

  if (typeof userId === 'string') {
    return userId.trim().length > 0 ? userId : null;
  }

  if (typeof (userId as { toString?: () => string }).toString === 'function') {
    const value = (userId as { toString: () => string }).toString();
    return value && value !== '[object Object]' ? value : null;
  }

  return null;
}

export async function writeAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await AuditLogModel.create({
      userId: normalizeUserId(input.userId),
      action: input.action,
      ipAddress: input.ipAddress || '',
      userAgent: input.userAgent || '',
      metadata: input.metadata || {},
    });
  } catch {
    // Do not break request lifecycle due to audit persistence failures.
  }
}


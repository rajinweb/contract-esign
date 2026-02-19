export type FieldOwner = 'me' | 'recipients';

type FieldLike = {
  fieldOwner?: unknown;
  recipientId?: unknown;
  toObject?: () => Record<string, unknown>;
};

export function normalizeFieldOwner(field: FieldLike | null | undefined): FieldOwner {
  const owner = String(field?.fieldOwner ?? '').toLowerCase();
  if (owner === 'me') return 'me';
  if (owner === 'recipient' || owner === 'recipients') return 'recipients';
  if (field?.recipientId) return 'recipients';
  return 'me';
}

export function normalizeFields<T extends Record<string, unknown>>(
  fields: T[] | null | undefined
): Array<T & { fieldOwner: FieldOwner }> {
  if (!Array.isArray(fields)) return [];

  return fields.map((field) => {
    const source = field as FieldLike | null | undefined;
    let plain: T;

    if (source && typeof source.toObject === 'function') {
      // Preserve method binding for Mongoose subdocuments.
      plain = source.toObject() as T;
    } else if (source && typeof source === 'object') {
      plain = { ...(source as T) };
    } else {
      plain = {} as T;
    }

    return {
      ...plain,
      fieldOwner: normalizeFieldOwner(plain as FieldLike),
    };
  });
}

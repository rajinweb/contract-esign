export type TemplateSignerRole = 'signer' | 'approver' | 'viewer';

export interface NormalizedTemplateSigner {
  id: string;
  name: string;
  email: string;
  role: TemplateSignerRole;
  order: number;
}

type TemplateFieldLike = {
  recipientId?: unknown;
};

type TemplateSignerLike = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  order?: unknown;
};

function toTemplateRole(value: unknown): TemplateSignerRole {
  if (value === 'approver' || value === 'viewer') return value;
  return 'signer';
}

function toFieldRecipientIds(fields: unknown): string[] {
  return Array.from(
    new Set(
      (Array.isArray(fields) ? fields : [])
        .map((field) => {
          const recipientId = (field as TemplateFieldLike)?.recipientId;
          return typeof recipientId === 'string' ? recipientId.trim() : '';
        })
        .filter((id) => id.length > 0)
    )
  );
}

export function normalizeTemplateDefaultSigners(
  defaultSigners: unknown,
  fields: unknown,
  templateId: string
): NormalizedTemplateSigner[] {
  const uniqueFieldRecipientIds = toFieldRecipientIds(fields);

  const signersSource =
    Array.isArray(defaultSigners) && defaultSigners.length > 0
      ? defaultSigners
      : uniqueFieldRecipientIds.map((id, index) => ({
          id,
          order: index + 1,
          role: 'signer',
          name: `Recipient ${index + 1}`,
          email: '',
        }));

  return signersSource.map((rawSigner, index) => {
    const signer = (rawSigner ?? {}) as TemplateSignerLike;
    const order = typeof signer.order === 'number' ? signer.order : index + 1;
    const id =
      typeof signer.id === 'string' && signer.id.trim().length > 0
        ? signer.id.trim()
        : uniqueFieldRecipientIds[index] || `recipient_${templateId}_${index + 1}`;

    return {
      id,
      order,
      role: toTemplateRole(signer.role),
      name: typeof signer.name === 'string' ? signer.name : '',
      email: typeof signer.email === 'string' ? signer.email : '',
    };
  });
}

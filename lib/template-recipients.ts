import { normalizeTemplateDefaultSigners, TemplateSignerRole } from './template-signers';

export const TEMPLATE_RECIPIENT_COLORS = [
  '#3B82F6',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#F97316',
  '#06B6D4',
  '#84CC16',
] as const;

export interface NormalizedTemplateRecipient {
  id: string;
  email: string;
  name: string;
  role: TemplateSignerRole;
  color: string;
  order: number;
  totalFields: number;
  status: 'pending';
}

export function buildTemplateRecipients(
  templateId: string,
  defaultSigners: unknown,
  fields: unknown
): NormalizedTemplateRecipient[] {
  return normalizeTemplateDefaultSigners(defaultSigners, fields, templateId).map((signer, index) => ({
    id: signer.id,
    email: signer.email,
    name: signer.name || `Recipient ${signer.order}`,
    role: signer.role,
    color: TEMPLATE_RECIPIENT_COLORS[index % TEMPLATE_RECIPIENT_COLORS.length],
    order: signer.order,
    totalFields: 0,
    status: 'pending',
  }));
}

import { DocumentField, DroppedComponent, FieldOwner } from '@/types/types';

const normalizeFieldId = (value: unknown, fallback?: string): string => {
  const str = value !== null && value !== undefined ? String(value) : '';
  if (str.trim().length > 0) return str;
  return fallback ?? '';
};

const allocateNumericId = (preferred: unknown, usedIds: Set<number>): number => {
  const parsed =
    typeof preferred === 'number'
      ? preferred
      : Number.parseInt(String(preferred ?? ''), 10);
  if (Number.isFinite(parsed) && parsed > 0 && !usedIds.has(parsed)) {
    usedIds.add(parsed);
    return parsed;
  }

  let nextId = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) + 1 : 1;
  while (usedIds.has(nextId)) {
    nextId += 1;
  }
  usedIds.add(nextId);
  return nextId;
};

const toComponentLabel = (type: unknown): string =>
  String(type || '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const dedupeFieldsById = (fields: DocumentField[]): DocumentField[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const order: DocumentField[] = [];
  const indexById = new Map<string, number>();

  fields.forEach((field) => {
    const id = normalizeFieldId((field as any)?.fieldId ?? field?.id);
    if (!id) return;
    const existingIndex = indexById.get(id);
    if (existingIndex === undefined) {
      indexById.set(id, order.length);
      order.push(field);
      return;
    }
    const existing = order[existingIndex];
    const existingValue = String((existing as any)?.value ?? '');
    const nextValue = String((field as any)?.value ?? '');
    if (nextValue && !existingValue) {
      order[existingIndex] = field;
    } else {
      order[existingIndex] = field;
    }
  });

  return order;
};

export const mapFieldToDroppedComponent = (
  field: DocumentField,
  usedIds: Set<number>
): DroppedComponent => {
  const fieldIdRaw = normalizeFieldId((field as any)?.fieldId ?? field?.id);
  const numericId = allocateNumericId((field as any)?.id ?? fieldIdRaw, usedIds);
  const fieldId = fieldIdRaw || String(numericId);
  const ownerRaw = String((field as any)?.fieldOwner ?? '').toLowerCase();
  const fieldOwner: FieldOwner =
    ownerRaw === 'me'
      ? 'me'
      : ownerRaw === 'recipient' || ownerRaw === 'recipients'
        ? 'recipients'
        : field?.recipientId
          ? 'recipients'
          : 'me';

  return {
    id: numericId,
    fieldId,
    component: toComponentLabel(field.type),
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    pageNumber: field.pageNumber,
    data: field.value,
    assignedRecipientId: field.recipientId,
    required: field.required !== false,
    placeholder: field.placeholder,
    pageRect: field.pageRect,
    fieldOwner,
  } as DroppedComponent;
};

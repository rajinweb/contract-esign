import Initials from "@/components/builder/Initials";
import UserItems from "@/components/builder/UserItems";
import { Button } from "@/components/Button";
import { User, SignatureInitial, itemTypes } from "@/types/types";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface SignCardProps {
  label: itemTypes;
  user?: User;
  itemId?: string;
  forceCreate?: boolean;
  handleSave: (updated: Partial<User>) => Promise<void>;
}

export default function SignCard({ label, user, itemId, forceCreate, handleSave }: SignCardProps) {
  const itemsByLabel: Record<itemTypes, SignatureInitial[]> = {
    Signature: user?.signatures || [],
    Initials: user?.initials || [],
    Stamp: user?.stamps || [],
  };

  const items = itemsByLabel[label];
  const selectedItem = forceCreate
    ? undefined
    : itemId
      ? items.find((item) => item.id === itemId)
      : items.find((item) => item.isDefault) || items[0];

  const [isEditing, setIsEditing] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePayloadByLabel: Record<itemTypes, (updatedItems: SignatureInitial[]) => Partial<User>> = {
    Signature: (updatedItems) => ({ signatures: updatedItems }),
    Initials: (updatedItems) => ({ initials: updatedItems }),
    Stamp: (updatedItems) => ({ stamps: updatedItems }),
  };

  const onCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const onAdd = async (item: SignatureInitial) => {
    try {
      setIsActioning(true);
      const hasSelectedItem = items.some((current) => current.id === item.id);
      const updatedItems = hasSelectedItem
        ? items.map((current) => ({
            ...current,
            isDefault: current.id === item.id,
          }))
        : [
            ...items.map((current) => ({ ...current, isDefault: false })),
            { ...item, isDefault: true },
          ];

      await handleSave(savePayloadByLabel[label](updatedItems));
      setIsEditing(false);
      setError(null);
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const onSetDefault = async () => {
    if (!selectedItem) return;
    try {
      setIsActioning(true);
      const updatedItems = items.map((current) => ({
        ...current,
        isDefault: current.id === selectedItem.id,
      }));
      await handleSave(savePayloadByLabel[label](updatedItems));
      setError(null);
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to set default. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const onDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsActioning(true);
      const remainingItems = items.filter((current) => current.id !== selectedItem.id);
      const normalizedItems = remainingItems.map((current, index) => {
        if (remainingItems.some((item) => item.isDefault)) return current;
        return { ...current, isDefault: index === 0 };
      });

      await handleSave(savePayloadByLabel[label](normalizedItems));
      setError(null);
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to delete. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const hasValue = Boolean(selectedItem?.value);
  const isDefault = Boolean(selectedItem?.isDefault);
  const lowerLabel = label.toLowerCase();

  return (
    <div
      className={`relative min-h-[230px] rounded-2xl border p-4 transition ${
        hasValue
          ? 'border-blue-300 bg-gradient-to-b from-blue-50/70 to-white shadow-sm'
          : 'border-dashed border-slate-300 bg-slate-50/80'
      }`}
    >
      {hasValue && (
        <span className="absolute left-3 top-3 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {isDefault ? "Default" : "Saved"}
        </span>
      )}

      <div className="mt-6 flex h-[130px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3">
        {hasValue ? (
          <Initials
            value={selectedItem?.value ?? undefined}
            width={480}
            height={180}
            preserveAspect
            className="!bg-transparent"
          />
        ) : (
          <p className="text-sm text-slate-400">Create new {lowerLabel}</p>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">
            {hasValue
              ? isDefault
                ? "Ready to use as default"
                : "Saved option available"
              : `No ${lowerLabel} added`}
          </p>
        </div>
        {hasValue ? (
          <div className="shrink-0 flex items-center gap-2">
            <Button
              inverted
              disabled={isDefault || isActioning}
              onClick={onSetDefault}
              className=" !px-3 text-xs whitespace-nowrap"
              label={isDefault ? "Default" : "Set Default"}
            />
            <Button
              inverted
              disabled={isActioning}
              onClick={onDelete}
              icon={<Trash2 size={14} />}
              className=" !border-red-200 !p-0 !text-red-600 hover:!bg-red-50"
              title="Delete"
            />
          </div>
        ) : (
          <Button
            inverted
            disabled={isActioning}
            onClick={() => (isEditing ? onCancel() : setIsEditing(true))}
            className="h-8 shrink-0 !px-3 text-xs"
            label={isEditing ? "Cancel" : "Create"}
          />
        )}
      </div>

      {isEditing && (
        <UserItems
          onClose={onCancel}
          onAdd={onAdd}
          type={label}
        />
      )}
      {error && <small className="absolute -bottom-0 text-xs text-red-500">{error}</small>}
    </div>
  );
}

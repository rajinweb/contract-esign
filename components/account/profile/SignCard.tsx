import Initials from "@/components/builder/Initials";
import UserItems from "@/components/builder/UserItems";
import { Button } from "@/components/Button";
import { User, SignatureInitial, itemTypes } from "@/types/types";
import { useState } from "react";

interface SignCardProps {
    label: itemTypes;
    user?: User;
    handleSave: (updated: Partial<User>) => Promise<void>; 
}


export default function SignCard({ label, user, handleSave }: SignCardProps) {
  const defaultSignature = user?.signatures?.find(s => s.isDefault);
  const defaultInitial = user?.initials?.find(i => i.isDefault);
  const defaultStamp = user?.stamps?.find(s => s.isDefault);

  const defaultsByLabel: Record<itemTypes, SignatureInitial | undefined> = {
    "Signature": defaultSignature,
    "Initials": defaultInitial,
    "Stamp": defaultStamp,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SignatureInitial | undefined>(() => defaultsByLabel[label]);
  const [error, setError] = useState<string | null>(null);



  const savePayloadByLabel: Record<itemTypes, (item: SignatureInitial) => Partial<User>> = {
    "Signature": (item: SignatureInitial) => ({ signatures: [item] }),
    "Initials": (item: SignatureInitial) => ({ initials: [item] }),
    "Stamp": (item: SignatureInitial) => ({ stamps: [item] }),
  };

  const onCancel = () => {
    setDraft(defaultsByLabel[label]);
    setIsEditing(false);
    setError(null);
  };

  const onAdd = async (item: SignatureInitial) => {
    setDraft(item);
    await handleSave(savePayloadByLabel[label](item));
    setIsEditing(false);
  };

  return (
    <div className="relative group border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] hover:border-blue-500 transition">
      <span className="mt-4 text-xs text-slate-500">{label}</span>
      <Initials value={draft?.value ?? undefined} />
       {isEditing && (
        <UserItems
          onClose={onCancel}
          onAdd={onAdd}
          type={label}
        />
      )}

      {/* Toggle button */}
      <Button inverted onClick={() => (isEditing ? onCancel() : setIsEditing(true))} className='absolute top-1 right-1 h-8 !p-2 border-0 text-xs hidden group-hover:block' label={isEditing ? 'Cancel' : 'Manage'} />
      {error && <small className="text-xs text-red-500 absolute -bottom-0">{error}</small>}
    </div>
  );
}
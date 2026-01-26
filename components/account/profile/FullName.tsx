import { Button } from "@/components/Button";
import Input from "@/components/forms/Input";
import { User } from "@/types/types";
import { useState } from "react";

export default function FullName({
  label,
  isSaving,
  user,
  setUser,
  handleSave,
}: {
  label: string;
  isSaving: boolean;
  user: User;
  setUser: (user: User) => void;
  handleSave: (updatedUser: Partial<User>) => void | Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
  });
  const hasChanges = draft.firstName !== (user.firstName || '') || draft.lastName !== (user.lastName || '');
  const onSave = async () => {
    if (!hasChanges) {
      setIsEditing(false); // cancel if no changes
      return;
    }
    setUser({
      ...user,
      firstName: draft.firstName,
      lastName: draft.lastName,
    });

    await handleSave({
      firstName: draft.firstName,
      lastName: draft.lastName,
    }); // API call
    setIsEditing(false);
  };
  const onCancel = () => {
    setIsEditing(false);
    setDraft({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    });
  };
  const startEditing = () => {
    setDraft({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    });
    setIsEditing(true);
  };
  return (
    <>
      <div className="relative flex justify-between py-4 border-b last:border-none items-end">
        {!isEditing && (
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-medium">
              {user?.firstName || user?.lastName
                ? `${user.firstName} ${user.lastName}`.trim()
                : 'Not added'}
            </p>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-4 items-end">
            <Input
              type="text"
              value={draft.firstName}
              onChange={(e) =>
                setDraft({ ...draft, firstName: e.target.value })
              }
              label="First Name"
              required
            />

            <Input
              type="text"
              label="Last Name"
              value={draft.lastName}
              onChange={(e) =>
                setDraft({ ...draft, lastName: e.target.value })
              }
              required
            />

            <Button
              type="button"
              disabled={isSaving}
              className="h-10 w-34"
              label={isSaving ? 'Saving...' : 'Save changes'}
              onClick={onSave}
            />
          </div>
        )}

        {/* Toggle button */}
        <Button
          onClick={isEditing ? onCancel : startEditing}
          inverted
          className="h-8 !p-2 border-0 text-xs"
          label={isEditing ? 'Cancel' : 'Change'}
        />
      </div>

      <small className="text-xs text-slate-400 -top-1 relative">
        Used as the sender name in invite emails
      </small>
    </>
  );
}
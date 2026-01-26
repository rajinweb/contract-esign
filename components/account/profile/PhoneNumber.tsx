import { Button } from '@/components/Button';
import { User } from '@/types/types';
import { useEffect, useState } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';

const sanitizePhone = (phone?: string | number): string | undefined => {
  if (!phone) return undefined;

  const phoneStr = phone.toString();
  try {
    if (isValidPhoneNumber(phoneStr)) return phoneStr;
  } catch {}
  return undefined; // fallback to empty input if invalid
};

export default function PhoneNumber({ label, user, isSaving, handleSave }: {
  label: string;
  user: User;
  isSaving: boolean;
  handleSave: (data: Partial<User>) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string | undefined>(
    sanitizePhone(user.phone)
  );
  const [error, setError] = useState<string | null>(null);

  // sync draft after user updates
  useEffect(() => {
    setDraft(sanitizePhone(user.phone));
  }, [user.phone]);

  const hasChanges = draft !== sanitizePhone(user.phone);

  const startEditing = () => {
    setError(null);
    setIsEditing(true);
  };

  const onCancel = () => {
    setDraft(sanitizePhone(user.phone));
    setError(null);
    setIsEditing(false);
  };

  const onSave = async () => {
    if (!draft) {
      setError('Phone cannot be empty');
      return;
    }

    if (!isValidPhoneNumber(draft)) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    await handleSave({ phone: draft }); // store E.164 string
    setIsEditing(false);
  };

  return (
    <div className="relative flex justify-between py-4 border-b items-end">
      {!isEditing && (
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="font-medium">
            {draft ? draft : 'Not added'}
          </p>
        </div>
      )}

      {isEditing && (
        <div className="flex gap-4 items-end min-w-[280px]">
          <div className="flex flex-col w-full">
            <label className="text-xs text-slate-500 mb-1">
              Phone number
            </label>
            <PhoneInput
              international
              defaultCountry="US"
              value={draft}
              onChange={setDraft}
              className="h-10 border rounded px-2 text-sm"
            />
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>

          <Button
            type="button"
            disabled={isSaving || !hasChanges}
            label={isSaving ? 'Saving...' : 'Save'}
            onClick={onSave}
          />
        </div>
      )}

      <Button
        onClick={isEditing ? onCancel : startEditing}
        inverted
        className="h-8 !p-2 border-0 text-xs"
        label={isEditing ? 'Cancel' : 'Change'}
      />
    </div>
  );
}
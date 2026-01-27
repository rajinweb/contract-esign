import { useState, useEffect } from 'react';
import Input from '@/components/forms/Input';
import { Button } from '@/components/Button';
import { User } from '@/types/types';
import { validateEmail } from '@/utils/utils';

interface EmailFieldProps {
  user: User;
  isSaving: boolean;
  handleSave: (updated: Partial<User>) => Promise<void>;
}

export default function EmailField({ user, isSaving, handleSave }: EmailFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(user.email || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(user.email || '');
  }, [user.email]);

  const hasChanges = () => draft !== (user.email || '');

  const onCancel = () => {
    setDraft(user.email || '');
    setIsEditing(false);
    setError(null);
  };

  const onSave = async () => {
    if (!draft) {
      setError('Email is required');
      return;
    }
    if (! validateEmail(draft)) {
      setError('Enter a valid email address');
      return;
    }

    if (!hasChanges()) {
      setIsEditing(false);
      return;
    }

    await handleSave({ email: draft });
    setIsEditing(false);
  };

  return (
    <div className="relative flex justify-between py-4 border-b last:border-none items-end">
      {!isEditing && (
        <div>
          <p className="text-sm text-slate-500">Email</p>
          <p className="font-medium">{user.email || 'Not added'}</p>
        </div>
      )}

      {isEditing && (
        <div className="flex gap-4 items-end">
          <Input
            type="email"
            value={draft}
            label="Email"
            onChange={(e) => setDraft(e.target.value)}
            required
          />
          <Button
            type="button"
            disabled={isSaving}
            className="h-10 w-34"
            label={isSaving ? 'Saving...' : 'Save'}
            onClick={onSave}
          />
        </div>
      )}

      {/* Toggle button */}
      <Button
        onClick={() => (isEditing ? onCancel() : setIsEditing(true))}
        inverted
        className="h-8 !p-2 border-0 text-xs"
        label={isEditing ? 'Cancel' : 'Change'}
      />

      {error && <small className="text-xs text-red-500 absolute -bottom-0">{error}</small>}
    </div>
  );
}

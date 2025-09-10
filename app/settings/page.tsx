'use client';
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';
import { FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import ResetPassword from '@/components/ResetPassword';



type InviteInputs = {
  inviteSubject: string;
  inviteMessage: string;
};

type SettingsInputs = {
  twoFactor: boolean;
  displayEsignId: boolean;
  dateFormat: string;
};

export default function SettingsPage() {
  const { user, setIsLoggedIn } = useContextStore();
  const router = useRouter();

  // server-loaded settings
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);


  // Invite form
  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    reset: resetInvite,
    formState: { isSubmitting: isInviteSubmitting },
  } = useForm<InviteInputs>({
    defaultValues: {
      inviteSubject: 'Document Name: Signature Request from Sender name',
      inviteMessage: 'Sender name invited you to sign Document Name',
    },
  });

  // Settings form
  const {
    register: registerSettings,
    handleSubmit: handleSubmitSettings,
    reset: resetSettings,
    watch: watchSettings,
  } = useForm<SettingsInputs>({
    defaultValues: {
      twoFactor: false,
      displayEsignId: true,
      dateFormat: 'MM/DD/YYYY (US)',
    },
  });

  // Load server settings + populate forms
  useEffect(() => {
   

    (async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const data = await res.json();
          resetSettings({
            twoFactor: !!data.twoFactor,
            displayEsignId: typeof data.displayEsignId === 'boolean' ? data.displayEsignId : true,
            dateFormat: data.dateFormat || 'MM/DD/YYYY (US)',
          });
          resetInvite({
            inviteSubject: data.inviteSubject || 'Document Name: Signature Request from Sender name',
            inviteMessage: data.inviteMessage || 'Sender name invited you to sign Document Name',
          });
        } else {
          // fallback to localStorage
          const s = typeof window !== 'undefined' && localStorage.getItem('userSettings');
          if (s) {
            const parsed = JSON.parse(s);
            resetSettings({
              twoFactor: !!parsed.twoFactor,
              displayEsignId: typeof parsed.displayEsignId === 'boolean' ? parsed.displayEsignId : true,
              dateFormat: parsed.dateFormat || 'MM/DD/YYYY (US)',
            });
            resetInvite({
              inviteSubject: parsed.inviteSubject || 'Document Name: Signature Request from Sender name',
              inviteMessage: parsed.inviteMessage || 'Sender name invited you to sign Document Name',
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSettings(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

 

  // INVITE
  const onSubmitInvite: SubmitHandler<InviteInputs> = async (data) => {
    setSaving(true);
    const payload = {
      inviteSubject: data.inviteSubject,
      inviteMessage: data.inviteMessage,
      twoFactor: watchSettings('twoFactor'),
      displayEsignId: watchSettings('displayEsignId'),
      dateFormat: watchSettings('dateFormat'),
    };
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        localStorage.setItem('userSettings', JSON.stringify(payload));
        toast('Settings saved');
      } else {
        localStorage.setItem('userSettings', JSON.stringify(payload));
        toast('Saved locally');
      }
    } catch (err) {
      localStorage.setItem('userSettings', JSON.stringify(payload));
      toast('Saved locally');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // SETTINGS general (checkbox/dateformat)
  const onSubmitSettings: SubmitHandler<SettingsInputs> = async (data) => {
    setSaving(true);
    try {
      const payload = {
        twoFactor: data.twoFactor,
        displayEsignId: data.displayEsignId,
        dateFormat: data.dateFormat,
        inviteSubject: watchInvite('inviteSubject'),
        inviteMessage: watchInvite('inviteMessage'),
      };
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        localStorage.setItem('userSettings', JSON.stringify(payload));
        toast('Settings saved');
      } else {
        localStorage.setItem('userSettings', JSON.stringify(payload));
      }
    } catch (err) {
      const payload = {
        twoFactor: data.twoFactor,
        displayEsignId: data.displayEsignId,
        dateFormat: data.dateFormat,
        inviteSubject: watchInvite('inviteSubject'),
        inviteMessage: watchInvite('inviteMessage'),
      };
      localStorage.setItem('userSettings', JSON.stringify(payload));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleDelete = async () => {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        localStorage.removeItem('AccessToken');
        localStorage.removeItem('User');
        setIsLoggedIn(false);
        router.replace('/');
      } else {
        toast('Unable to delete account');
      }
    } catch (err) {
      toast('Network error');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // helpers to watch invite fields (used in settings submit)
  const watchInvite = (name: keyof InviteInputs) => {
    // direct reading from invite form by DOM is fine here because react-hook-form manages it
    // but for simplicity we use get from register values by calling resetInvite earlier
    // as a lightweight approach simply read from the form inputs:
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    return el?.value ?? (name === 'inviteSubject' ? '' : '');
  };

  if (loadingSettings) return <div className="p-6">Loading...</div>;

  return (
    <main className="max-w-4xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Login & Security -> Profile save */}
      <section className="bg-white rounded p-6 mb-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Login and Security</h2>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{user?.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="font-medium">{user?.name}</div>
          </div>
           <div>
            <div className="text-sm text-gray-500">Picture URL</div>
             <Image
                src={user?.picture || 'https://i.pravatar.cc/40?img=5'}
                alt="User"
                className="w-8 h-8 rounded-full border border-gray-300"
                width={40}
                height={40}
            />
          </div>
          <button className="text-blue-600" onClick={() => router.push('/profile')}>
            Change
          </button>
        </div>

       <ResetPassword />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Two-factor authentication</div>
            <div className="text-sm text-gray-600">Add an extra layer of security to your account.</div>
          </div>
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" {...registerSettings('twoFactor')} />
            <span className="text-sm">{watchSettings('twoFactor') ? 'On' : 'Off'}</span>
          </label>
        </div>
      </section>

      {/* Invite settings */}
      <section className="bg-white rounded p-6 mb-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Default Invite Settings</h2>

        <form onSubmit={handleSubmitInvite(onSubmitInvite)}>
          <div className="mb-4">
            <label className="block text-sm text-gray-600">Invite Email Subject</label>
            <input {...registerInvite('inviteSubject')} className="w-full border px-3 py-2 rounded" />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600">Invite Email Message</label>
            <textarea {...registerInvite('inviteMessage')} className="w-full border px-3 py-2 rounded" rows={3} />
          </div>

          <div className="flex justify-end">
            <button disabled={isInviteSubmitting || saving} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              {isInviteSubmitting || saving ? 'Saving...' : 'Save invite settings'}
            </button>
          </div>
        </form>
      </section>

      {/* Additional settings */}
      <section className="bg-white rounded p-6 mb-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Additional Settings</h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-1 text-xs border p-1 rounded border-blue-600 border-dashed">
            <FileSignature className="h-10 w-10 text-blue-600" strokeWidth="1" />
            <small className="flex flex-col text-gray-500 leading-tight w-32">
              <span>Verified by SecureSign</span>
              <span>01/01/2025 00:00:00 UTC</span>
              <span>abcdefghi01234567890</span>
            </small>
          </div>

          <div className="flex items-center justify-between w-full">
            <div>
              <div className="text-sm text-gray-600">Display SecureSign e-signature ID</div>
              <div className="text-sm text-gray-500">An e-signature ID will be displayed on signed documents.</div>
            </div>

            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" {...registerSettings('displayEsignId')} />
              <span className="text-sm">{watchSettings('displayEsignId') ? 'On' : 'Off'}</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 py-4 border-t border-b my-4">
          <label className="block text-sm text-gray-600">Date Format</label>
          <select {...registerSettings('dateFormat')} className="border px-3 py-2 rounded">
            <option>MM/DD/YYYY (US)</option>
            <option>DD/MM/YYYY (EU)</option>
            <option>YYYY-MM-DD (ISO)</option>
          </select>
          <div className="ml-auto">
            <button onClick={handleSubmitSettings(onSubmitSettings)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Delete Your Account</div>
            <div className="text-sm text-gray-500">You can easily delete your account but remember there is no undo for this operation.</div>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded">
            {deleting ? 'Deleting...' : 'Delete account'}
          </button>
        </div>
      </section>
    </main>
  );
}
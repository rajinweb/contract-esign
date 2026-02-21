'use client';
import React, { useEffect, useState } from 'react';
import useContextStore from '@/hooks/useContextStore';

import Image from 'next/image';
import { blobToURL } from '@/lib/pdf';
import Input from '@/components/forms/Input';
import { Button } from '@/components/Button';
import { Camera, LoaderCircle, PenLine, Stamp, Type } from 'lucide-react';
import { itemTypes, SignatureInitial, User } from '@/types/types';

import Address from '@/components/account/profile/Address';
import FullName from '@/components/account/profile/FullName';
import PhoneNumber from '@/components/account/profile/PhoneNumber';
import EmailField from '@/components/account/profile/EmailField';
import SignCard from '@/components/account/profile/SignCard';
import UserItems from '@/components/builder/UserItems';
import { useAuth } from '@/components/auth/AuthProvider';
import { getCookieValue } from '@/utils/cookies';

import 'react-phone-number-input/style.css';

export default function ProfilePage() {
  const { user, setUser } = useContextStore();
  const { updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState<itemTypes | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const b64 = await blobToURL(f);
      setUser(prev => prev ? { ...prev, picture: b64 } : null);
      await handleSave({ picture: b64 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (
    updatedUser: Partial<User>,
    e?: React.FormEvent | React.MouseEvent
  ) => {
    e?.preventDefault();
    setIsSaving(true);


    try {
      const csrfToken = getCookieValue('csrf_token');
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify(updatedUser),
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'Update failed');
      }

      const data = await res.json();

      setUser(data.user);
      updateUser({
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        firstName: data.user?.firstName,
        lastName: data.user?.lastName,
        picture: data.user?.picture,
      });
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const hydrateProfile = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (cancelled || !data?.user) {
          return;
        }

        setUser(data.user);
        updateUser({
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          picture: data.user.picture,
        });
      } catch {
        // Best-effort profile hydration.
      }
    };

    void hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [setUser, updateUser, user?.id]);


  if (!user) {
    return (
      <main className="max-w-4xl mx-auto py-12">
        <p className="text-center text-gray-600">Please log in to view your profile.</p>
      </main>
    );
  }
  const noImage = 'https://i.pravatar.cc/40?img=5';
  const topSignatures = [...(user.signatures || [])]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .slice(0, 3);
  const topInitials = [...(user.initials || [])]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .slice(0, 3);
  const topStamps = [...(user.stamps || [])]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .slice(0, 3);
  const savePayloadByLabel = {
    Signature: (updatedItems: SignatureInitial[]) => ({ signatures: updatedItems }),
    Initials: (updatedItems: SignatureInitial[]) => ({ initials: updatedItems }),
    Stamp: (updatedItems: SignatureInitial[]) => ({ stamps: updatedItems }),
  } as const;

  const handleLibrarySelect = async (item: SignatureInitial) => {
    if (!activeLibrary) return;

    const currentItems =
      activeLibrary === 'Signature'
        ? user.signatures || []
        : activeLibrary === 'Initials'
          ? user.initials || []
          : user.stamps || [];

    const hasSelectedItem = currentItems.some((current) => current.id === item.id);
    const updatedItems = hasSelectedItem
      ? currentItems.map((current) => ({
          ...current,
          isDefault: current.id === item.id,
        }))
      : [
          ...currentItems.map((current) => ({ ...current, isDefault: false })),
          { ...item, isDefault: true },
        ];

    await handleSave(savePayloadByLabel[activeLibrary](updatedItems));
    setActiveLibrary(null);
  };


  return (
    <>
      <header className="mb-10 flex items-center gap-6">
        <div className="relative">
          <Image
            src={user.picture || noImage}
            alt={user.name || user.email || 'User Profile'}
            className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md bg-white"
            width={80}
            height={80}
            unoptimized
          />
          {isSaving && <div className='absolute top-1/2 left-1/2  -translate-x-1/2 -translate-y-1/2'>
            <LoaderCircle className="animate-spin text-white" size={18} />
          </div>
          }
          <label className='absolute bg-blue-500 hover:bg-blue-600 cursor-pointer p-2 -bottom-2 right-0 rounded-full shadow-md'>
            <Camera size={16} className="text-white" />
            <Input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Your Profile</h1>
          <small>
            Manage your identity and signing preferences.
          </small>
          <div className='flex text-xs gap-4 mt-2 text-slate-500'>
            <span className='bg-purple-600/80  px-2 rounded-md text-white'>Role: {user?.role || 'N/A'}</span>
            |
            <span>Registration Date : {user?.createdAt ? new Date(user.createdAt).toDateString() : 'N/A'}</span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 ">
          <div className="rounded-xl border p-6 bg-white shadow">
            <h2 className="font-semibold">Personal Information</h2>

            <FullName label="Full Name" user={user} setUser={setUser} isSaving={isSaving} handleSave={(updatedUser) => handleSave(updatedUser)} />

            <PhoneNumber
              label="Phone Number"
              user={user}
              isSaving={isSaving}
              handleSave={handleSave}
            />

           <EmailField
              user={user}
              isSaving={isSaving}
              handleSave={handleSave}
            />

          </div>
          <Address
            user={user}
            isSaving={isSaving}
            handleSave={async (updatedUser) => {
              if (!user) return;

              // Optimistically update the user state for a better UX
              if (updatedUser.address) {
                setUser((prev) =>
                  prev
                    ? {
                        ...prev,
                        address: {
                          ...prev.address,
                          ...updatedUser.address,
                        },
                      }
                    : null
                );
              }

              // Pass the user update to the main handler
              return handleSave(updatedUser);
            }}
          />
          <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <PenLine className="h-5 w-5 text-blue-600" />
                  Default Signing Methods
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Keep your primary signature, initials, and stamp ready for faster document completion.
                </p>
              </div>
              <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Profile Defaults
              </span>
            </div>
            <div className="space-y-6 p-6">
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                    <PenLine className="h-4 w-4 text-blue-600" />
                    Primary Signatures
                  </h3>
                  <Button
                    inverted
                    onClick={() => setActiveLibrary('Signature')}
                    className="h-8 !px-3 text-xs"
                    label="Manage"
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {topSignatures.map((signature) => (
                    <SignCard
                      key={signature.id}
                      label="Signature"
                      itemId={signature.id}
                      user={user}
                      handleSave={handleSave}
                    />
                  ))}
                  {topSignatures.length < 3 && (
                    <SignCard
                      key="signature-create"
                      label="Signature"
                      forceCreate
                      user={user}
                      handleSave={handleSave}
                    />
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                    <Type className="h-4 w-4 text-blue-600" />
                    Initials
                  </h3>
                  <Button
                    inverted
                    onClick={() => setActiveLibrary('Initials')}
                    className="h-8 !px-3 text-xs"
                    label="Manage"
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {topInitials.map((initial) => (
                    <SignCard
                      key={initial.id}
                      label="Initials"
                      itemId={initial.id}
                      user={user}
                      handleSave={handleSave}
                    />
                  ))}
                  {topInitials.length < 3 && (
                    <SignCard
                      key="initials-create"
                      label="Initials"
                      forceCreate
                      user={user}
                      handleSave={handleSave}
                    />
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                    <Stamp className="h-4 w-4 text-blue-600" />
                    Professional Stamps
                  </h3>
                  <Button
                    inverted
                    onClick={() => setActiveLibrary('Stamp')}
                    className="h-8 !px-3 text-xs"
                    label="Manage"
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {topStamps.map((stamp) => (
                    <SignCard
                      key={stamp.id}
                      label="Stamp"
                      itemId={stamp.id}
                      user={user}
                      handleSave={handleSave}
                    />
                  ))}
                  {topStamps.length < 3 && (
                    <SignCard
                      key="stamp-create"
                      label="Stamp"
                      forceCreate
                      user={user}
                      handleSave={handleSave}
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
       
      </section>
      {activeLibrary && (
        <UserItems
          type={activeLibrary}
          onClose={() => setActiveLibrary(null)}
          onAdd={handleLibrarySelect}
        />
      )}

    </>
  );
}

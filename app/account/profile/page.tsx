'use client';
import React, { useState, useEffect, useRef } from 'react';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';

import Image from 'next/image';
import { blobToURL } from '@/lib/pdf';
import Input from '@/components/forms/Input';
import { Camera, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import Initials from '@/components/builder/Initials';
import { User } from '@/types/types';

import Address from '@/components/account/profile/Address';
import FullName from '@/components/account/profile/FullName';
import PhoneNumber from '@/components/account/profile/PhoneNumber';
import EmailField from '@/components/account/profile/EmailField';

import 'react-phone-number-input/style.css'

export default function ProfilePage() {
  const { user, setUser } = useContextStore();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const b64 = await blobToURL(f);
      setUser(prev => prev ? { ...prev, picture: b64 } : null);
      handleSave({picture: b64 });
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
    setError(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Update failed');

      const data = await res.json();

      setUser(data.user);
      localStorage.setItem('User', JSON.stringify(data.user));
    } catch (err) {
      setError('Network error');
    } finally {
      setIsSaving(false);
    }
  };


  if (!user) {
    return (
      <main className="max-w-4xl mx-auto py-12">
        <p className="text-center text-gray-600">Please log in to view your profile.</p>
      </main>
    );
  }
  const noImage = 'https://i.pravatar.cc/40?img=5';
  const defaultSignature = user?.signatures?.find(s => s.isDefault);
  const defaultInitial = user?.initials?.find(i => i.isDefault);
  const defaultStamp = user?.stamps?.find(s => s.isDefault);

  return (
    <main className=" mx-auto p-4 md:p-8 lg:p-12">
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

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 ">
        {/* Left */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-xl border p-6 space-y-3 bg-white shadow">
            <h2 className="font-semibold mb-6">Personal Information</h2>

            <FullName label="Full Name" user={user} setUser={setUser} isSaving={isSaving} handleSave={(updatedUser) => handleSave(updatedUser)} />

            <PhoneNumber
              label="Phone Number"
              user={user}
              isSaving={isSaving}
              handleSave={handleSave}
            />

           <EmailField
              user={user}
              setUser={setUser}
              isSaving={isSaving}
              handleSave={handleSave}
            />

          </div>
          <Address
            user={user}
            isSaving={isSaving}
            handleSave={async (updatedAddress) => {
              if (!user) return Promise.resolve();
              // Update local state
              setUser(prev => prev ? { ...prev, address: { ...prev.address, ...updatedAddress } } : null)
              // Save to backend (pass as Partial<User>)
              return handleSave( { ...user.address, ...updatedAddress });
            }}
          />

          <div className="rounded-xl border p-6 bg-white shadow ">
            <h2 className="font-semibold mb-6">Default Signing Methods</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SignCard label="Signature" value={defaultSignature?.value} />
              <SignCard label="Initials" value={defaultInitial?.value} />
              <SignCard label="Stamp" value={defaultStamp?.value} />
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}


function SignCard({ label, value, image }: { label: string; value?: string; image?: string }) {
  return (
    <div className="relative group border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] hover:border-blue-500 transition">
      <Button inverted className='absolute top-1 right-1 h-8 !p-2 border-0 text-xs hidden group-hover:block' label="Manage" />
      <span className="mt-4 text-xs text-slate-500">{label}</span>
      <Initials value={value} />
    </div>

  );
}

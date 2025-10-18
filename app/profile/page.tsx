'use client';
import React, { useState, useEffect } from 'react';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';

import Image from 'next/image';
import { blobToURL } from '@/lib/pdf';

export default function ProfilePage() {
  const { user, setUser } = useContextStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [picture, setPicture] = useState<string | null>(user?.picture || null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPicture(user?.picture || null);
  }, [user]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const b64 = await blobToURL(f); 
      setPicture(b64);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // include AccessToken from localStorage if present
    const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, picture }),
        credentials: 'include', // support cookie flow
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Update failed' }));
        setError(err?.message || 'Update failed');
        setIsSaving(false);
        return;
      }

      const data = await res.json();
      // update context + localStorage
      setUser(data.user);
      localStorage.setItem('User', JSON.stringify(data.user));
      setIsSaving(false);
      // optional: show a success flash or redirect
    } catch (err) {
      console.error(err);
      setError('Network error');
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
  return (
    <main className="max-w-4xl mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Your Profile</h1>

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded shadow">
        <div className="flex items-center space-x-4">
          <Image
            src={picture || noImage}
            alt={name || email}
            className="w-20 h-20 rounded-full object-cover border"
            width={80}
            height={80}
            unoptimized
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Change picture</label>
            <input type="file" accept="image/*" onChange={handleFile} className="mt-1" />
            <div className="mt-2 text-sm text-gray-500">Or paste an image URL below</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Picture URL</label>
          <input
            type="text"
            value={picture || ''}
            onChange={(e) => setPicture(e.target.value || null)}
            className="mt-1 block w-full border px-3 py-2 rounded"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={email} readOnly className="mt-1 block w-full border px-3 py-2 rounded bg-gray-50" />
        </div>

        {error && <div className="text-red-600">{error}</div>}

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
'use client';
import React, { createContext, useState, useEffect } from 'react';
import { Doc, ContextValue, ContextProviderProps, User } from '@/types/types';
import { pdfjs } from 'react-pdf';
import { initializePdfWorker } from '@/utils/pdfjsSetup';

export const ContextStore = createContext<ContextValue | undefined>(undefined);

// Initialize the PDF.js worker (centralized setup)
initializePdfWorker(pdfjs);

const ContextProvider = ({ children }: ContextProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<string | File | Doc | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trashedTemplatesCount, setTrashedTemplatesCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('AccessToken');
    const userJson = localStorage.getItem('User');
    if (token) {
      setIsLoggedIn(true);
    }
    if (userJson) {
      try { setUser(JSON.parse(userJson)); } catch { setUser(null); }
    }
  }, []);

   // persist user when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('User');
    const currentUserString = user ? JSON.stringify(user) : null;

    if (currentUserString && currentUserString !== storedUser) {
      localStorage.setItem('User', currentUserString);
    } else if (!currentUserString && storedUser) {
      localStorage.removeItem('User');
    }
  }, [user]);
const contextObject=
  {
      selectedFile,
      setSelectedFile,
      documents,
      setDocuments,
      isLoggedIn,
      setIsLoggedIn,
      showModal,
      setShowModal,
      user,
      setUser,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      trashedTemplatesCount,
      setTrashedTemplatesCount,
    }

  return (
    <ContextStore.Provider
      value={contextObject}
    >
      {children}
    </ContextStore.Provider>
  );
};

export default ContextProvider;

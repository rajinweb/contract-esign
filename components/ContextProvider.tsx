'use client';
import React, { createContext, useState, useEffect } from 'react'; 
import { Doc, ContextValue, ContextProviderProps, User } from '@/types/types';

export const ContextStore = createContext<ContextValue | undefined>(undefined);

const ContextProvider = ({ children }: ContextProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
    if (user) {
      localStorage.setItem('User', JSON.stringify(user));
    } else {
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

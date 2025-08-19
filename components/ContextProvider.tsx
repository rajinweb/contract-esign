'use client';
import React, { createContext, useState, useEffect } from 'react'; // Import useEffect
import { Doc, ContextValue, ContextProviderProps } from '@/types/types';
import { useRouter } from 'next/navigation';

export const ContextStore = createContext<ContextValue | undefined>(undefined);

const ContextProvider = ({ children }: ContextProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('AccessToken');
  });
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('AccessToken');
    console.log(token)
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <ContextStore.Provider
      value={{ selectedFile, setSelectedFile, documents, setDocuments,  isLoggedIn,
      setIsLoggedIn, showModal, setShowModal}}
    >
      {children}
    </ContextStore.Provider>
  );
};

export default ContextProvider;

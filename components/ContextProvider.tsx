'use client';
import React, { createContext, useState } from 'react';
import { Doc, ContextValue, ContextProviderProps } from '@/types/types';

export const ContextStore = createContext<ContextValue | undefined>(undefined);

const ContextProvider = ({ children }: ContextProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);

  return (
    <ContextStore.Provider
      value={{ selectedFile, setSelectedFile, documents, setDocuments }}
    >
      {children}
    </ContextStore.Provider>
  );
};

export default ContextProvider;

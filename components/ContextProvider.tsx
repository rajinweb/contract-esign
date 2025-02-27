'use client';
import React, { createContext, useState, ReactNode } from 'react';

// Define types for selectedFile and documents
interface ContextValue {
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

// Create the context with a default value that matches the type
export const ContextStore = createContext<ContextValue | undefined>(undefined);

interface ContextProviderProps {
  children: ReactNode;
}

const ContextProvider = ({ children }: ContextProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  return (
    <ContextStore.Provider
      value={{ selectedFile, setSelectedFile, documents, setDocuments }}
    >
      {children}
    </ContextStore.Provider>
  );
};

export default ContextProvider;

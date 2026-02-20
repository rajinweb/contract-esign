'use client';
import { createContext, useState } from 'react';
import { Doc, ContextValue, ContextProviderProps, User } from '@/types/types';

export const ContextStore = createContext<ContextValue | undefined>(undefined);

const ContextProvider = ({ children }: ContextProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<string | File | Doc | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trashedTemplatesCount, setTrashedTemplatesCount] = useState(0);

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

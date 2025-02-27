'use client';
import { useContext } from 'react';
import { ContextStore } from '@/components/ContextProvider';

// Custom hook to access the context
const useContextStore = () => {
  const context = useContext(ContextStore);
  if (!context) {
    throw new Error('useContextStore must be used within a ContextProvider');
  }

  return context;
};

export default useContextStore;

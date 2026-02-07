"use client";
import { useCallback } from 'react';
import { DroppedComponent, Recipient } from '@/types/types';

interface UseFieldUpdatesArgs {
  recipients: Recipient[];
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  saveState: (newState: DroppedComponent[]) => void;
}

export const useFieldUpdates = ({
  recipients,
  setDroppedComponents,
  saveState,
}: UseFieldUpdatesArgs) => {
  const updateField = useCallback((data: string | null, id: number) => {
    setDroppedComponents(prev => {
      const newComponents = prev.map(c => {
        if (c.id === id) {
          return { ...c, data };
        }
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });
      saveState(newComponents);
      return newComponents;
    });
  }, [setDroppedComponents, saveState, recipients]);

  return {
    updateField,
  };
};

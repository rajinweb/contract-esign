"use client";
import { useCallback, useEffect } from 'react';
import { DroppedComponent } from '@/types/types';
import { useUndoRedo } from '@/hooks/builder/useUndoRedo';

export const useUndoRedoControls = (
  initialState: DroppedComponent[],
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>
) => {
  const { saveState, undo, redo, canUndo, canRedo, resetHistory } = useUndoRedo(initialState);

  const handleUndo = useCallback((): void => {
    const previousState = undo();
    if (previousState) {
      setDroppedComponents(previousState);
    }
  }, [undo, setDroppedComponents]);

  const handleRedo = useCallback((): void => {
    const nextState = redo();
    if (nextState) {
      setDroppedComponents(nextState);
    }
  }, [redo, setDroppedComponents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    saveState,
    canUndo,
    canRedo,
    resetHistory,
    handleUndo,
    handleRedo,
  };
};

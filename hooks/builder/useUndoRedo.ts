import { useState, useCallback } from 'react';
import { DroppedComponent } from '@/types/types';

interface HistoryState {
  droppedComponents: DroppedComponent[];
  timestamp: number;
}

export const useUndoRedo = (initialState: DroppedComponent[]) => {
  const [history, setHistory] = useState<HistoryState[]>([
    { droppedComponents: initialState, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const saveState = useCallback((newState: DroppedComponent[]) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new state
      newHistory.push({ droppedComponents: [...newState], timestamp: Date.now() });
      
      // Limit history to 50 states to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, 49));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1]?.droppedComponents;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1].droppedComponents;
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetHistory = useCallback((newState: DroppedComponent[]) => {
    setHistory([{ droppedComponents: [...newState], timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, []);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    currentState: history[currentIndex]?.droppedComponents || []
  };
};
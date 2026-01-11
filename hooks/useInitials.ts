"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DroppedComponent, InitialItem } from "@/types/types";
import useContextStore from "@/hooks/useContextStore";

const STORAGE_KEY_PREFIX = "user-default-initials";

function getStorageKey(userId?: string) {
  return `${STORAGE_KEY_PREFIX}:${userId || "anonymous"}`;
}

export function useInitials(
  droppedComponents: DroppedComponent[],
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>
) {
  const { user } = useContextStore();
  const storageKey = useMemo(() => getStorageKey(user?.id), [user?.id]);

  const [defaultInitial, setDefaultInitial] = useState<InitialItem | null>(null);

  /* ----------------------------------
   Load persisted default initials
  -----------------------------------*/
  useEffect(() => {
    if (!user) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setDefaultInitial(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey, user]);

  /* ----------------------------------
   Persist default initials
  -----------------------------------*/
  const persistDefaultInitial = useCallback(
    (initial: InitialItem) => {
      setDefaultInitial(initial);
      localStorage.setItem(storageKey, JSON.stringify(initial));
    },
    [storageKey]
  );

  /* ----------------------------------
   Apply initials to ONE field
  -----------------------------------*/
  const applyInitialToField = useCallback(
    (fieldId: number, initial: InitialItem) => {
      setDroppedComponents(prev =>
        prev.map(dc =>
          dc.id === fieldId
            ? { ...dc, data: initial.value }
            : dc
        )
      );
    },
    [setDroppedComponents]
  );

  /* ----------------------------------
   Apply initials to ALL EMPTY fields
  -----------------------------------*/
  const applyInitialToAllEmpty = useCallback(
    (initial: InitialItem) => {
      setDroppedComponents(prev =>
        prev.map(dc =>
          dc.component === "Initials" && !dc.data
            ? { ...dc, data: initial.value }
            : dc
        )
      );
    },
    [setDroppedComponents]
  );

  /* ----------------------------------
   Auto-apply default initials when fields appear
  -----------------------------------*/
  useEffect(() => {
    if (!defaultInitial) return;

    const hasEmptyInitials = droppedComponents.some(
      dc => dc.component === "Initials" && !dc.data
    );

    if (hasEmptyInitials) {
      applyInitialToAllEmpty(defaultInitial);
    }
  }, [droppedComponents, defaultInitial, applyInitialToAllEmpty]);

  return {
    defaultInitial,
    setDefaultInitial: persistDefaultInitial,
    applyInitialToField,
    applyInitialToAllEmpty,
  };
}

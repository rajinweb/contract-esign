"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DroppedComponent, SignatureInitial } from "@/types/types";
import useContextStore from "@/hooks/useContextStore";

const STORAGE_KEY_PREFIX = "user-defaults";

function getStorageKey(userId?: string) {
  return `${STORAGE_KEY_PREFIX}:${userId || "anonymous"}`;
}

export function useSignatureInitial(
  droppedComponents: DroppedComponent[],
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>
) {
  const { user } = useContextStore();
  const storageKey = useMemo(() => getStorageKey(user?.id), [user?.id]);

  const [defaultSigIn, setDefaultSigIn] = useState<SignatureInitial | null>(null);

  /* ----------------------------------
   Load persisted default Signature and Initials
  -----------------------------------*/
  useEffect(() => {
    if (!user) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setDefaultSigIn(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey, user]);

  /* ----------------------------------
   Persist default Signature and Initials
  -----------------------------------*/
  const persistdefaultSigIn = useCallback(
    (initial: SignatureInitial) => {
      setDefaultSigIn(initial);
      localStorage.setItem(storageKey, JSON.stringify(initial));
    },
    [storageKey]
  );

  /* ----------------------------------
   Apply Signature and Initials to ONE field
  -----------------------------------*/
  const applySigInToField = useCallback(
    (fieldId: number, initial: SignatureInitial) => {
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
   Apply Signature and Initials to ALL EMPTY fields
  -----------------------------------*/
  const applySigInToAllEmpty = useCallback(
    (initial: SignatureInitial) => {
      setDroppedComponents(prev =>
        prev.map(dc =>
          (dc.component === "Initials" || dc.component === "Signature") && !dc.data
            ? { ...dc, data: initial.value }
            : dc
        )
      );
    },
    [setDroppedComponents]
  );

  /* ----------------------------------
   Auto-apply default Signature and Initials when fields appear
  -----------------------------------*/
  useEffect(() => {
    if (!defaultSigIn) return;

    const hasEmptySigIn = droppedComponents.some(
      dc => (dc.component === "Initials" || dc.component === "Signature") && !dc.data
    );

    if (hasEmptySigIn) {
      applySigInToAllEmpty(defaultSigIn);
    }
  }, [droppedComponents, defaultSigIn, applySigInToAllEmpty]);

  return {
    defaultSigIn,
    setDefaultSigIn: persistdefaultSigIn,
    applySigInToField,
    applySigInToAllEmpty,
  };
}

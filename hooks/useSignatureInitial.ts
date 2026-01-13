"use client";

import { DroppedComponent, SignatureInitial, SignatureInitialType } from "@/types/types";
import { useCallback, useEffect, useMemo, useState } from "react";


interface UseSignatureInitialProps {
  userId?: string;
  user?: any;
  setUser?: (user: any) => void;
  droppedComponents: DroppedComponent[];
  updateComponentData: (
    id: DroppedComponent["id"],
    data: SignatureInitial
  ) => void;
}


/* -------------------------------------------------------
   Hook
------------------------------------------------------- */

export function useSignatureInitial({
  userId,
  user,
  setUser,
  droppedComponents,
  updateComponentData,
}: UseSignatureInitialProps) {
  /* -----------------------------
     Local storage
  ----------------------------- */

  const storageKey = useMemo(
    () => `user-defaults:${userId}`,
    [userId]
  );

  /* -----------------------------
     Defaults state
  ----------------------------- */

  const [defaults, setDefaults] = useState<{
    signature: SignatureInitial | null;
    initial: SignatureInitial | null;
  }>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored
        ? JSON.parse(stored)
        : { signature: null, initial: null };
    } catch {
      return { signature: null, initial: null };
    }
  });

  /* -----------------------------
     Persist defaults
  ----------------------------- */

  const persistDefaults = useCallback(
    (next: typeof defaults) => {
      setDefaults(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  /* -----------------------------
     Apply default to empty fields
  ----------------------------- */

  const applyToAllEmpty = useCallback(
    (kind: SignatureInitialType, value: SignatureInitial) => {
      droppedComponents.forEach(dc => {
        if (
          dc.component === kind &&
          !dc.data &&
          dc.fieldOwner === "me"
        ) {
          updateComponentData(dc.id, value);
        }
      });
    },
    [droppedComponents, updateComponentData]
  );

  /* -----------------------------
     Set default (SINGLE SOURCE)
  ----------------------------- */

  const setDefault = useCallback(
    (kind: SignatureInitialType, value: SignatureInitial) => {
      const key = kind === "Initials" ? "initial" : "signature";

      const nextDefaults = {
        ...defaults,
        [key]: value,
      };

      /* 1️⃣ local state + storage */
      persistDefaults(nextDefaults);

      /* 2️⃣ user context (UI sync) */
      if (user && setUser) {
        const collectionKey =
          kind === "Initials" ? "initials" : "signatures";

        const updatedCollection = (user[collectionKey] || []).map(
          (item: SignatureInitial) => ({
            ...item,
            isDefault: item.id === value.id,
          })
        );

        setUser({
          ...user,
          [collectionKey]: updatedCollection,
        });
      }

      /* 3️⃣ immediate editor apply */
      applyToAllEmpty(kind, value);
    },
    [
      defaults,
      persistDefaults,
      user,
      setUser,
      applyToAllEmpty,
    ]
  );

  /* -----------------------------
     Auto-apply when defaults change
  ----------------------------- */

  useEffect(() => {
    if (defaults.signature) {
      applyToAllEmpty("Signature", defaults.signature);
    }
    if (defaults.initial) {
      applyToAllEmpty("Initials", defaults.initial);
    }
  }, [defaults, applyToAllEmpty]);

  /* -----------------------------
     Initialize from user profile
  ----------------------------- */

  useEffect(() => {
    if (!user) return;

    const signature =
      user.signatures?.find((s: any) => s.isDefault) || null;
    const initial =
      user.initials?.find((i: any) => i.isDefault) || null;

    const hasStored = localStorage.getItem(storageKey);

    if (!hasStored && (signature || initial)) {
      persistDefaults({
        signature,
        initial,
      });
    }
  }, [user, storageKey, persistDefaults]);

  /* -----------------------------
     Public API
  ----------------------------- */

  return {
    defaults,
    setDefault,
  };
}

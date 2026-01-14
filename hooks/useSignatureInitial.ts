"use client";

import { DroppedComponent, SignatureInitial, SignatureInitialType } from "@/types/types";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api-client";

interface UseSignatureInitialProps {
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
  user,
  setUser,
  droppedComponents,
  updateComponentData,
}: UseSignatureInitialProps) {

  /* -----------------------------
     Defaults (derived from user)
  ----------------------------- */
  const [defaults, setDefaults] = useState<{
    signature: SignatureInitial | null;
    initial: SignatureInitial | null;
  }>({
    signature: null,
    initial: null,
  });

  /* -----------------------------
     Apply default to empty fields
  ----------------------------- */
  const applyToAllEmpty = useCallback(
    (fieldsType: SignatureInitialType, value: SignatureInitial) => {
      droppedComponents.forEach(dc => {
        if (
          dc.component === fieldsType &&
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
     Sync defaults from USER
  ----------------------------- */
  useEffect(() => {
    if (!user) return;

    setDefaults({
      signature:
        user.signatures?.find((s: SignatureInitial) => s.isDefault) || null,
      initial:
        user.initials?.find((i: SignatureInitial) => i.isDefault) || null,
    });
  }, [user]);

  /* -----------------------------
     Auto-apply defaults
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
     SET DEFAULT (PUBLIC API)
     - persists to backend
     - updates context
     - updates editor
  ----------------------------- */
  const setDefault = useCallback(
    async (type: SignatureInitialType, value: SignatureInitial) => {
      if (!user) return;

      const key = type === "Signature" ? "signatures" : "initials";
      const items: SignatureInitial[] = user[key] || [];

      const updated = items.map(item => ({
        ...item,
        isDefault: item.id === value.id,
      }));

      try {
        const response = await api.patch("/user/profile", {
          [key]: updated,
        });

        if (response.user) {
          setUser?.(response.user);
        }

        // Immediate editor apply
        applyToAllEmpty(type, value);
      } catch (err) {
        console.error(`Failed to update default ${key}`, err);
      }
    },
    [user, setUser, applyToAllEmpty]
  );

  return {
    defaults,
    setDefault,
  };
}

"use client";

import { DroppedComponent, SignatureInitial, User, itemTypes } from "@/types/types";
import { useCallback, useEffect, useMemo } from "react";

import { api } from "@/lib/api";

interface UseSignatureInitialProps {
  user?: User | null;
  setUser?: (user: User | null) => void;
  droppedComponents: DroppedComponent[];
  updateComponentData: (
    id: DroppedComponent["id"],
    data: SignatureInitial
  ) => void;
}

interface ProfilePatchResponse {
  user?: User;
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
  const defaults = useMemo<{
    signature: SignatureInitial | null;
    initial: SignatureInitial | null;
    stamp: SignatureInitial | null;
  }>(
    () => ({
      signature:
        user?.signatures?.find((s: SignatureInitial) => s.isDefault) || null,
      initial:
        user?.initials?.find((i: SignatureInitial) => i.isDefault) || null,
      stamp:
        user?.stamps?.find((s: SignatureInitial) => s.isDefault) || null,
    }),
    [user]
  );

  /* -----------------------------
     Apply default to empty fields
  ----------------------------- */
  const applyToAllEmpty = useCallback(
    (fieldsType: itemTypes, value: SignatureInitial) => {
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
     Auto-apply defaults
  ----------------------------- */
  useEffect(() => {
    if (defaults.signature) {
      applyToAllEmpty("Signature", defaults.signature);
    }
    if (defaults.initial) {
      applyToAllEmpty("Initials", defaults.initial);
    }
    if (defaults.stamp) {
      applyToAllEmpty("Stamp", defaults.stamp);
    }
  }, [defaults, applyToAllEmpty]);

  /* -----------------------------
     SET DEFAULT (PUBLIC API)
     - persists to backend
     - updates context
     - updates editor
  ----------------------------- */
  const setDefault = useCallback(
    async (type: itemTypes, value: SignatureInitial) => {
      if (!user) return;

      const key = type === "Signature" ? "signatures" : type === "Stamp" ? "stamps" : "initials";
      const items: SignatureInitial[] = user[key] || [];

      const updated = items.map(item => ({
        ...item,
        isDefault: item.id === value.id,
      }));

      try {
        const response = await api.patch<ProfilePatchResponse>("/user/profile", {
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

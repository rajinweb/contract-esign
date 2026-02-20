"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/Button";
import SignatureCanvas from "react-signature-canvas";
import { Type, ArrowLeft, PlusCircle, LineSquiggle, Signature } from "lucide-react";
import useContextStore from "@/hooks/useContextStore";
import Input from "../forms/Input";
import { v4 as uuidv4 } from "uuid";
import { api } from "@/lib/api";
import { DroppingField, itemTypes, SignatureInitial, User } from "@/types/types";
import Image from "next/image";

/* ================= Types ================= */

type Screen = "select" | "create";
type CreateMode = "typed" | "drawn";

interface UserItemsProps {
  onClose: () => void;
  onAdd: (initial: SignatureInitial) => void;
  component?: DroppingField | null;
  type?: itemTypes;
}

interface SelectScreenProps {
  items: SignatureInitial[];
  selectedId: string | null;
  isSignature: boolean;
  isStamp: boolean;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onMakeDefault: (item: SignatureInitial) => void;
  onDelete: (id: string) => void;
}

interface CreateScreenProps {
  isSignature: boolean;
  isStamp: boolean;
  createMode: CreateMode;
  typedValue: string;
  makeDefault: boolean;
  canvasRef: React.RefObject<SignatureCanvas>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setCreateMode: (m: CreateMode) => void;
  setTypedValue: (v: string) => void;
  setDrawnValue: (v: string | null) => void;
  setMakeDefault: (v: boolean) => void;
  onCanvasEnd: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
}

interface ProfilePatchResponse {
  user?: User;
}

const normalizeStoredItems = (items: SignatureInitial[]): SignatureInitial[] => {
  let defaultFound = false;
  return items.map((item, index) => {
    const isDefault = Boolean(item.isDefault) && !defaultFound;
    if (isDefault) {
      defaultFound = true;
    }
    const fallbackId =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id
        : `legacy-${item.type}-${index}-${item.value.slice(0, 12)}`;
    return { ...item, id: fallbackId, isDefault };
  });
};

/* ================= Main Component ================= */

const UserItems: React.FC<UserItemsProps> = ({
  onClose,
  onAdd,
  component,
  type,
}) => {
  const { user, setUser } = useContextStore();

  const canvasRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [screen, setScreen] = useState<Screen>("select");
  const [createMode, setCreateMode] = useState<CreateMode>("typed");
  const [typedValue, setTypedValue] = useState("");
  const [drawnValue, setDrawnValue] = useState<string | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Determine type from prop or component
  const effectiveType = type || 
    (component?.component === "Signature" ? "Signature" : 
     component?.component === "Stamp" ? "Stamp" : 
     "Initials");

  const isSignature = effectiveType === "Signature";
  const isStamp = effectiveType === "Stamp";
  const isInitial = effectiveType === "Initials";
  const userName = user?.name ?? "";

  /* ================= Derived ================= */

  const defaultInitial = useMemo(() => {
    if (!userName) return "";
    return userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  }, [userName]);

  const userDefaults = useMemo<SignatureInitial[]>(() => {
    if (!user) return [];
    const sourceItems = isInitial
      ? user.initials || []
      : isStamp
        ? user.stamps || []
        : user.signatures || [];
    const normalized = normalizeStoredItems(sourceItems);
    if (normalized.length === 0 && isInitial) {
      return [
        {
          id: "initials-fallback",
          value: defaultInitial,
          type: "typed",
          isDefault: true,
        },
      ];
    }
    return normalized;
  }, [defaultInitial, isInitial, isStamp, user]);

  const effectiveSelectedId = (() => {
    if (selectedId && userDefaults.some((item) => item.id === selectedId)) {
      return selectedId;
    }
    if (component?.data) {
      const matched = userDefaults.find((item) => item.value === component.data);
      if (matched) return matched.id;
    }
    return userDefaults[0]?.id ?? null;
  })();


  /* ================= Helpers ================= */

  const updateUserItems = async (
    items: SignatureInitial[],
    type: "initials" | "signatures" | "stamps"
  ) => {
    if (!user) return;
    const payload =
      type === "initials"
        ? { initials: items }
        : type === "signatures"
        ? { signatures: items }
        : { stamps: items };

    const res = await api.patch<ProfilePatchResponse>("/user/profile", payload);
    if (res.user) setUser(res.user);
  };

  const handleCanvasEnd = () => {
    if (!canvasRef.current || canvasRef.current.isEmpty()) return;
    setDrawnValue(canvasRef.current.getTrimmedCanvas().toDataURL("image/png"));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newItem: SignatureInitial = {
        id: uuidv4(),
        value: reader.result as string,
        type: "drawn",
        isDefault: false,
      };

      const updated = [...userDefaults, newItem];
      setSelectedId(newItem.id);
      updateUserItems(updated, isInitial ? "initials" : isStamp ? "stamps" : "signatures");
      setScreen("select");
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSelect = () => {
    const selected = userDefaults.find((i) => i.id === effectiveSelectedId);
    if (selected) {
      onAdd(selected);
      onClose();
    }
  };

  const handleAddNew = () => {
    if (!typedValue && !drawnValue) return;

    const newItem: SignatureInitial = {
      id: uuidv4(),
      value: createMode === "typed" ? typedValue : drawnValue || "",
      type: createMode,
      isDefault: makeDefault,
    };

    const updated = [
      ...userDefaults.map((i) => ({ ...i, isDefault: newItem.isDefault ? false : i.isDefault })),
      newItem,
    ];

    setSelectedId(newItem.id);
    updateUserItems(updated, isInitial ? "initials" : isStamp ? "stamps" : "signatures");
    setScreen("select");
    setTypedValue("");
    setDrawnValue(null);
    setMakeDefault(false);
  };

  /* ================= Render ================= */

  if (!user) {
    return (
      <Modal visible title="Loading…" onClose={onClose}>
        <div className="p-6 text-center text-gray-600">Loading signer info…</div>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      title={`Select Your ${isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"}`}
      onClose={onClose}
      handleCancel={onClose}
      handleConfirm={screen === "select" ? handleConfirmSelect : handleAddNew}
      className="w-[700px]"
      confirmLabel={screen === "select" ? `Use ${isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"}` : `Add ${isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"}`}
    >
      {screen === "select" ? (
        <SelectScreen
          items={userDefaults}
          selectedId={effectiveSelectedId}
          isSignature={isSignature}
          isStamp={isStamp}
          onSelect={setSelectedId}
          onAddNew={() => setScreen("create")}
          onMakeDefault={(item) =>
            updateUserItems(
              userDefaults.map((i) => ({ ...i, isDefault: i.id === item.id })),
              isInitial ? "initials" : isStamp ? "stamps" : "signatures"
            )
          }
          onDelete={(id) =>
            updateUserItems(
              userDefaults.filter((i) => i.id !== id),
              isInitial ? "initials" : isStamp ? "stamps" : "signatures"
            )
          }
        />
      ) : (
        <CreateScreen
          isSignature={isSignature}
          isStamp={isStamp}
          createMode={createMode}
          typedValue={typedValue}
          makeDefault={makeDefault}
          canvasRef={canvasRef}
          fileInputRef={fileInputRef}
          setCreateMode={setCreateMode}
          setTypedValue={setTypedValue}
          setDrawnValue={setDrawnValue}
          setMakeDefault={setMakeDefault}
          onCanvasEnd={handleCanvasEnd}
          onUpload={handleUpload}
          onBack={() => setScreen("select")}
        />
      )}
    </Modal>
  );
};

export default UserItems;

/* ================= Child Components ================= */

const SelectScreen: React.FC<SelectScreenProps> = ({
  items,
  selectedId,
  isSignature,
  isStamp,
  onSelect,
  onAddNew,
  onMakeDefault,
  onDelete,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 p-3 pt-0 overflow-auto max-h-[350px]">
      <p className="text-gray-700 text-sm">
        Select your {isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"} or add a new one:
      </p>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Button
          onClick={onAddNew}
          inverted
          icon={<PlusCircle className="mb-2 text-blue-600" />}
          label={`Add New ${isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"}`}
          className="flex-col gap-0 border-dashed border-gray-500 h-32"
        />

        {items.map((item) => (
          <Cards
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            isSignature={isSignature}
            isStamp={isStamp}
            isMenuOpen={openMenuId === item.id}
            menuRef={openMenuId === item.id ? menuRef : null}
            onSelect={() => {
              onSelect(item.id);
            }}
            onToggleMenu={() =>
              setOpenMenuId((prev) => (prev === item.id ? null : item.id))
            }
            onMakeDefault={() => {
              onMakeDefault(item);
              setOpenMenuId(null);
            }}
            onDelete={() => {
              onDelete(item.id);
              setOpenMenuId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
};




const Cards = ({
  item,
  selected,
  isSignature,
  isStamp,
  isMenuOpen,
  menuRef,
  onSelect,
  onToggleMenu,
  onMakeDefault,
  onDelete,
}: {
  item: SignatureInitial;
  selected: boolean;
  isSignature: boolean;
  isStamp: boolean;
  isMenuOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement> | null;
  onSelect: () => void;
  onToggleMenu: () => void;
  onMakeDefault: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="relative">
      {/* 🔴 THIS MUST BE THE CLICK TARGET */}
      <Button
        inverted
        onClick={onSelect}
        className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 transition-all ${
          selected
            ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        {item.isDefault && (
          <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Default
          </span>
        )}

        {item.type === "typed" ? (
          <span
            className="text-5xl text-gray-800"
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            {item.value || "-"}
          </span>
        ) : (
          <Image
            src={item.value}
            alt={isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"}
            width={200}
            height={96}
            className="max-h-24 max-w-full"
            unoptimized
          />
        )}
      </Button>

      {/* MENU */}
      <div className="absolute right-2 top-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // 🔴 MUST stop selection
            onToggleMenu();
          }}
          className="p-1 rounded-full hover:bg-gray-200"
        >
          ⋮
        </button>

        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 mt-1 w-32 rounded-md border bg-white shadow-lg z-10"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMakeDefault();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              Make Default
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};




const CreateScreen: React.FC<CreateScreenProps> = ({
  isSignature,
  isStamp,
  createMode,
  typedValue,
  makeDefault,
  canvasRef,
  fileInputRef,
  setCreateMode,
  setTypedValue,
  setDrawnValue,
  setMakeDefault,
  onCanvasEnd,
  onUpload,
  onBack,
}) => {
  return (
    <>
      {!isStamp && (
        <>
          {/* Mode Switch */}
          <div className="flex gap-4">
            <Button
              onClick={() => setCreateMode("typed")}
              className={`flex-1 ${
                createMode === "typed"
                  ? "!bg-gray-200 text-gray-600 border-none"
                  : "border-gray-300"
              }`}
              icon={<Type />}
              label="Type"
              inverted
            />
            <Button
              onClick={() => setCreateMode("drawn")}
              className={`flex-1 ${
                createMode === "drawn"
                  ? "!bg-gray-200 text-gray-600 border-none"
                  : "border-gray-300"
              }`}
              icon={<LineSquiggle />}
              label="Draw"
              inverted
            />
          </div>

          {createMode === "typed" && (
            <>
              <Input
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                className="text-center my-3"
                placeholder={`Your ${isSignature ? "Signature" : "Initials"}`}
              />
              <div className="flex h-32 items-center justify-center border border-dashed rounded-md bg-gray-50 mb-3">
                <span
                  className="text-5xl"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  {typedValue}
                </span>
              </div>
            </>
          )}

          {createMode === "drawn" && (
            <div className="rounded-md border border-dashed border-gray-300 my-3">
              <SignatureCanvas
                ref={canvasRef}
                penColor="black"
                canvasProps={{
                  width: 500,
                  height: 150,
                  className: "bg-white",
                }}
                onEnd={onCanvasEnd}
              />
              <div className="flex justify-end border-t border-dashed bg-gray-50 p-2">
                <Button
                  inverted
                  label="Clear"
                  onClick={() => {
                    canvasRef.current?.clear();
                    setDrawnValue(null);
                  }}
                  className="!text-xs !py-2"
                />
              </div>
            </div>
          )}
        </>
      )}

      {(isSignature || isStamp) && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg"
            onChange={onUpload}
            style={{ display: "none" }}
          />
          <Button
            type="button"
            aria-label={`Upload Your ${isStamp ? "Stamp" : "Signature"}`}
            className={`flex w-full rounded-md border border-dashed border-gray-300 bg-white p-6 text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isStamp && "h-48"
            }`}
            inverted
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center">
              <Signature size={36} />
              <div className="ml-5">
                <span className="block font-semibold text-gray-900">
                  Upload Your {isStamp ? "Stamp" : "Signature"}
                </span>
                <small className="text-gray-600">
                  Upload an image of your{" "}
                  {isStamp ? "stamp" : "handwritten signature"} here.
                </small>
              </div>
            </div>
          </Button>
        </>
      )}

      <DefaultCheckbox
        makeDefault={makeDefault}
        setMakeDefault={setMakeDefault}
      />

      <Button
        type="button"
        onClick={onBack}
        label="Back"
        icon={<ArrowLeft size={16} />}
        inverted
        className="absolute bottom-4 left-4"
      />
    </>
  );
};


/* ================= Default Checkbox ================= */

const DefaultCheckbox = ({
  makeDefault,
  setMakeDefault,
}: {
  makeDefault?: boolean;
  setMakeDefault?: (val: boolean) => void;
}) => {
  if (makeDefault === undefined || !setMakeDefault) return null;

  return (
    <label className="flex items-center gap-2 text-sm mt-3">
      <input
        type="checkbox"
        checked={makeDefault}
        onChange={(e) => setMakeDefault(e.target.checked)}
      />
      Make this default
    </label>
  );
};

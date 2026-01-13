"use client";

import React, { useRef, useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/Button";
import SignatureCanvas from "react-signature-canvas";
import { Type, ArrowLeft, PlusCircle, LineSquiggle } from "lucide-react";
import useContextStore from "@/hooks/useContextStore";
import Input from "../forms/Input";
import { v4 as uuidv4 } from "uuid";
import { api } from "@/lib/api-client";
import { DroppingField, SignatureInitial } from "@/types/types";

type Screen = "select" | "create";
type CreateMode = "type" | "draw";

interface AddSignatureInitialDialogProps {
  onClose: () => void;
  onAddInitial: (initial: SignatureInitial) => void;
  component:DroppingField | null;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 150;

const AddSignatureInitialDialog: React.FC<AddSignatureInitialDialogProps> = ({
  onClose,
  onAddInitial,
  component
}) => {
  const { user, setUser } = useContextStore();
  const canvasRef = useRef<SignatureCanvas>(null);

  const [userInitials, setUserInitials] = useState<SignatureInitial[]>([]);
  const [screen, setScreen] = useState<Screen>("select");
  const [createMode, setCreateMode] = useState<CreateMode>("type");
  const [typedValue, setTypedValue] = useState("");
  const [drawnValue, setDrawnValue] = useState<string | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOwner = component?.fieldOwner === "me";
  const isSignature = component?.component === "Signature";
  const isInitial = !isSignature;

  // Default initials
  const defaultInitial = React.useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  useEffect(() => {
    if (!user) return;

    const items = isInitial ? (user.initials || []) : (user.signatures || []);
    let defaultFound = false;

    const normalized = items.map((i) => {
      const isDefault = i.isDefault && !defaultFound;
      if (isDefault) defaultFound = true;
      return { ...i, id: i.id || uuidv4(), isDefault };
    });

    setUserInitials(normalized);

    if (normalized.length > 0) setSelectedId(normalized.find(i => i.isDefault)?.id || normalized[0].id);
    else if (isInitial) {
      const defaultItem: SignatureInitial = {
        id: uuidv4(),
        value: defaultInitial,
        type: "typed",
        isDefault: true,
      };
      setUserInitials([defaultItem]);
      setSelectedId(defaultItem.id);
    }
  }, [user, defaultInitial, isInitial]);

  const updateUserInitialsOrSignatures = async (
    newItems: SignatureInitial[],
    type: "initials" | "signatures"
  ) => {
    if (!user) return;
    try {
      const payload = type === "initials" ? { initials: newItems } : { signatures: newItems };
      const response = await api.patch("/user/profile", payload);
      if (response.user) setUser(response.user);
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
    }
  };

  const handleCanvasEnd = () => {
    if (!canvasRef.current || canvasRef.current.isEmpty()) return;
    setDrawnValue(canvasRef.current.getTrimmedCanvas().toDataURL("image/png"));
  };

  // Add or select initial
  const handleInitialConfirm = (userItem: SignatureInitial) => {
    let item;
    const exists = userInitials.find((i) => i.id === userItem.id);

    if (!exists) {
      item = [
        ...userInitials.map((i) => ({
          ...i,
          isDefault: userItem.isDefault ? false : i.isDefault,
        })),
        userItem,
      ];
    } else {
      item = userInitials.map((i) => ({
        ...i,
        isDefault: i.id === userItem.id,
      }));
    }

    setUserInitials(item);
    updateUserInitialsOrSignatures(item, isInitial ? "initials" : "signatures");
    setSelectedId(userItem.id);
  };

  // // When user clicks confirm in create screen
  const handleAddInitials = () => {
    if (!typedValue && !drawnValue) return;

    const newItem: SignatureInitial = {
      id: uuidv4(),
      value: createMode === "type" ? typedValue : drawnValue || "",
      type: createMode === "type" ? "typed" : "drawn",
      isDefault: makeDefault,
    };

    const newItems = [
      ...userInitials.map(i => ({ ...i, isDefault: newItem.isDefault ? false : i.isDefault })),
      newItem,
    ];

    setUserInitials(newItems);
    setSelectedId(newItem.id);
    updateUserInitialsOrSignatures(newItems, isInitial ? "initials" : "signatures");

    setTypedValue("");
    setDrawnValue(null);
    setMakeDefault(false);
    setCreateMode("type");
    setScreen("select");
  };

  const handleDeleteInitial = (id: string) => {
    const newInitials = userInitials.filter((i) => i.id !== id);
    setUserInitials(newInitials);
    updateUserInitialsOrSignatures(newInitials, isInitial ? "initials" : "signatures");
  };

  const handleConfirmSelect = () => {
    const selected = userInitials.find((i) => i.id === selectedId);
    if (selected) {
      updateUserInitialsOrSignatures(
        userInitials.map(i => ({ ...i, isDefault: i.id === selected.id })),
        isInitial ? "initials" : "signatures"
      );
      onAddInitial(selected);
      onClose();
    }
  };

  if (!user) return (
    <Modal visible title={`Add ${isSignature ? "Signature" : "Initials"}`} onClose={onClose}>
      <div className="p-6 text-center text-gray-600">Loading signer info…</div>
    </Modal>
  );

  return (
    <Modal
      visible
      title={`Select Your ${isSignature ? "Signature" : "Initials"}`}
      onClose={onClose}
      handleCancel={onClose}
      handleConfirm={screen === "select" ? handleConfirmSelect : handleAddInitials}
      width="700px"
      ConfirmLabel={screen === "select" ? `Use ${isSignature ? "Signature" : "Initials"}` : `Add ${isSignature ? "Signature" : "Initials"}`}
    >
      <div className="space-y-6">
        {/* ================= SCREEN 1 ================= */}
        {screen === "select" && (
          <>
            <p className="text-gray-700">Select your {isSignature ? "signature" : "initial"} or add a new one:</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Button
                onClick={() => {
                  setScreen("create");
                  setCreateMode("type");
                  setTypedValue("");
                  setDrawnValue(null);
                  setMakeDefault(false);
                }}
                inverted
                icon={<PlusCircle className="mb-2 text-blue-600" />}
                label={`Add New ${isSignature ? "Signature" : "Initials"}`}
                className="flex-col gap-0"
              />
              {userInitials.map((item) => (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => setSelectedId(item.id)}
                    className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 transition-all ${
                      selectedId === item.id ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-gray-200 hover:border-gray-300"
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
                      <img src={item.value} alt={isSignature ? "Signature" : "Initial"} className="max-h-24 max-w-full" />
                    )}
                  </button>

                  {/* Menu */}
                  <div ref={menuRef} className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // don't trigger card selection
                        setOpenMenuId((prev) =>
                          prev === item.id ? null : item.id
                        );
                      }}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      ⋮
                    </button>

                    {openMenuId === item.id && (
                      <div className="absolute right-0 mt-1 w-32 rounded-md border bg-white shadow-lg z-10">
                        <button
                          onClick={() => {
                            handleInitialConfirm({ ...item, isDefault: true });
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                        >
                          Make Default
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteInitial(item.id)
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Default Checkbox */}
            {selectedId && (
              <DefaultCheckbox
                selectedId={selectedId}
                initials={userInitials}
                onChange={(checked) => {
                  const newInitials = userInitials.map((i) => ({
                    ...i,
                    isDefault: i.id === selectedId ? checked : (checked ? false : i.isDefault),
                  }));
                  setUserInitials(newInitials);
                  updateUserInitialsOrSignatures(newInitials, isInitial ? "initials" : "signatures");
                }}
              />
            )}
          </>
        )}

        {/* ================= SCREEN 2 ================= */}
        {screen === "create" && (
          <>
            {/* Mode Switch */}
            <div className="flex gap-4 mb-4">
              <Button
                onClick={() => setCreateMode("type")}
                className={`flex-1 ${
                  createMode === "type"
                    ? "!bg-gray-200 text-gray-600 border-none"
                    : "border-gray-300"
                }`}
                icon={<Type />}
                label="Type"
                inverted
              />
              <Button
                onClick={() => setCreateMode("draw")}
                className={`flex-1 rounded-lg border p-4 text-center font-semibold ${
                  createMode === "draw"
                    ? "!bg-gray-200 text-gray-600 border-none"
                    : "border-gray-300"
                }`}
                icon={<LineSquiggle />}
                label="Draw"
                inverted
              />
            </div>

            {createMode === "type" && (
              <>
                <Input
                  value={typedValue}
                  onChange={(e) =>
                    setTypedValue(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 4)
                    )
                  }
                  className="text-center text-2xl font-bold"
                  placeholder={`Your ${isSignature ? "Signature" : "Initials"}`}
                />
                <div className="flex h-32 items-center justify-center rounded-md bg-gray-50">
                  <span
                    className="text-5xl"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  >
                    {typedValue}
                  </span>
                </div>
              </>
            )}

            {createMode === "draw" && (
              <div className="rounded-md border border-dashed">
                <SignatureCanvas
                  ref={canvasRef}
                  penColor="black"
                  canvasProps={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    className: "bg-white",
                  }}
                  onEnd={handleCanvasEnd}
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

            {/* Default Checkbox */}
            <DefaultCheckbox
              makeDefault={makeDefault}
              setMakeDefault={setMakeDefault}
            />
            <Button
              type="button"
              onClick={() => setScreen("select")}
              label="Back"
              icon={<ArrowLeft size={16} />}
              inverted
              className="absolute bottom-4 left-4"
            />
          </>
        )}
      </div>
    </Modal>
  );
};

/* ================= Reusable DefaultCheckbox ================= */
const DefaultCheckbox = ({
  selectedId,
  initials,
  makeDefault,
  setMakeDefault,
  onChange,
}: {
  selectedId?: string | null;
  initials?: SignatureInitial[];
  makeDefault?: boolean;
  setMakeDefault?: (val: boolean) => void;
  onChange?: (checked: boolean) => void;
}) => {
  // Select screen
  if (selectedId && initials && onChange) {
    const isDefault =
      initials.find((i) => i.id === selectedId)?.isDefault || false;
    return (
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => onChange(e.target.checked)}
        />
        Make this my default initial
      </label>
    );
  }

  // Create screen
  if (makeDefault !== undefined && setMakeDefault) {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
        />
        Make this my default initial
      </label>
    );
  }

  return null;
};

export default AddSignatureInitialDialog;

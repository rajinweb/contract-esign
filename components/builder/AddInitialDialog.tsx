"use client";

import React, { useRef, useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/Button";
import SignatureCanvas from "react-signature-canvas";
import { Type, ArrowLeft, PlusCircle, LineSquiggle } from "lucide-react";
import useContextStore from "@/hooks/useContextStore";
import Input from "../forms/Input";
import { InitialItem } from "@/types/types";
import { v4 as uuidv4 } from "uuid";
import { api } from "@/lib/api-client";

type Screen = "select" | "create";
type CreateMode = "type" | "draw";

interface AddInitialDialogProps {
  onClose: () => void;
  onAddInitial: (initial: InitialItem) => void;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 150;

const AddInitialDialog: React.FC<AddInitialDialogProps> = ({
  onClose,
  onAddInitial,
}) => {
  const { user, setUser } = useContextStore();
  const canvasRef = useRef<SignatureCanvas>(null);

  const [userInitials, setUserInitials] = useState<InitialItem[]>([]);
  const [screen, setScreen] = useState<Screen>("select");
  const [createMode, setCreateMode] = useState<CreateMode>("type");
  const [typedValue, setTypedValue] = useState("");
  const [drawnValue, setDrawnValue] = useState<string | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Default initial from user name
  const defaultInitial = React.useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  // Load initial initials on mount
  useEffect(() => {
    if (!user) return;

    let defaultFound = false;
    const initials = (user.initials || []).map((i: any) => {
      const isDefault = i.isDefault && !defaultFound;
      if (isDefault) {
        defaultFound = true;
      }
      return { ...i, id: i.id || i._id?.toString() || uuidv4(), isDefault };
    });
    setUserInitials(initials);

    if (initials.length > 0) {
      const defaultItem = initials.find((i) => i.isDefault);
      if (defaultItem) {
        setSelectedId(defaultItem.id);
      } else {
        setSelectedId(initials[0].id);
      }
    } else {
      // If no initials, create a default one
      const defaultItem: InitialItem = {
        id: uuidv4(),
        value: defaultInitial,
        type: "typed",
        isDefault: true,
      };
      setSelectedId(defaultItem.id);
      setUserInitials([defaultItem]);
    }
  }, [user, defaultInitial]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateUserInitials = async (newInitials: InitialItem[]) => {
    if (!user) return;
    try {
      const response = await api.patch("/user/profile", {
        initials: newInitials,
      });
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error("Failed to update initials:", error);
    }
  };

  // Canvas end
  const handleCanvasEnd = () => {
    if (!canvasRef.current || canvasRef.current.isEmpty()) return;
    setDrawnValue(canvasRef.current.getTrimmedCanvas().toDataURL("image/png"));
  };

  // Add or select initial
  const handleInitialConfirm = (initial: InitialItem) => {
    let newInitials;
    const exists = userInitials.find((i) => i.id === initial.id);

    if (!exists) {
      newInitials = [
        ...userInitials.map((i) => ({
          ...i,
          isDefault: initial.isDefault ? false : i.isDefault,
        })),
        initial,
      ];
    } else {
      newInitials = userInitials.map((i) => ({
        ...i,
        isDefault: i.id === initial.id,
      }));
    }

    setUserInitials(newInitials);
    updateUserInitials(newInitials);
    setSelectedId(initial.id);
  };

  // // When user clicks confirm in create screen
  const handleAddInitials = () => {
    const newInitial: InitialItem = {
      id: uuidv4(),
      value: createMode === "type" ? typedValue : drawnValue || "",
      type: createMode === "type" ? "typed" : "drawn",
      isDefault: makeDefault,
    };
    if (!newInitial.value) return;
    handleInitialConfirm(newInitial);

    // Reset create screen
    setTypedValue("");
    setDrawnValue(null);
    setMakeDefault(false);
    setCreateMode("type");
    setScreen("select");
  };

  const handleDeleteInitial = (id: string) => {
    const newInitials = userInitials.filter((i) => i.id !== id);
    setUserInitials(newInitials);
    updateUserInitials(newInitials);
  };

  const handleConfirmSelect = () => {
    const selected = userInitials.find((i) => i.id === selectedId);
    if (selected) {
      // Mark selected as default
      handleInitialConfirm({ ...selected, isDefault: true });
      onAddInitial(selected);
      onClose();
    }
  };

  if (!user) {
    return (
      <Modal visible title="Add Initials" onClose={onClose}>
        <div className="p-6 text-center text-gray-600">
          Loading signer info…
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      title="Select Your Initials"
      onClose={() => onClose()}
      handleCancel={() => onClose()}
      handleConfirm={() =>
        screen === "select" ? handleConfirmSelect() : handleAddInitials()
      }
      width="700px"
      ConfirmLabel={screen === "select" ? "Use Initials" : "Add Initials"}
    >
      <div className="space-y-6">
        {/* ================= SCREEN 1 ================= */}
        {screen === "select" && (
          <>
            <p className="text-gray-700">
              Select your initial or add a new one:
            </p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Add New Initial */}
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
                label="Add New Initials"
                className="flex-col gap-0"
              />
              {userInitials.map((initial) => (
                <div key={initial.id} className="relative">
                  <button
                    onClick={() => setSelectedId(initial.id)}
                    className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 transition-all ${
                      selectedId === initial.id
                        ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {initial.isDefault && (
                      <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Default
                      </span>
                    )}
                    {initial.type === "typed" ? (
                      <span
                        className="text-5xl text-gray-800"
                        style={{ fontFamily: "'Dancing Script', cursive" }}
                      >
                        {initial.value || "-"}
                      </span>
                    ) : (
                      <img
                        src={initial.value}
                        alt="Initial Signature"
                        className="max-h-24 max-w-full"
                      />
                    )}
                  </button>

                  {/* Menu */}
                  <div ref={menuRef} className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // don't trigger card selection
                        setOpenMenuId((prev) =>
                          prev === initial.id ? null : initial.id
                        );
                      }}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      ⋮
                    </button>

                    {openMenuId === initial.id && (
                      <div className="absolute right-0 mt-1 w-32 rounded-md border bg-white shadow-lg z-10">
                        <button
                          onClick={() => {
                            handleInitialConfirm({ ...initial, isDefault: true });
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                        >
                          Make Default
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteInitial(initial.id)
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
                  updateUserInitials(newInitials);
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
                label="Type Initials"
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
                label="Draw Initials"
                inverted
              />
            </div>

            {/* Type Initials */}
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
                  placeholder="Your Initials"
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

            {/* Draw Initials */}
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
  initials?: InitialItem[];
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

export default AddInitialDialog;

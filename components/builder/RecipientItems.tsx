"use client";

import React, { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/Button";
import SignatureCanvas from "react-signature-canvas";
import { Type, ArrowLeft, LineSquiggle, Signature } from "lucide-react";
import Input from "../forms/Input";
import { v4 as uuidv4 } from "uuid";
import { DroppingField, SignatureInitial } from "@/types/types";
import { useRenderCanvas } from "@/hooks/useRenderCanvas";

/* ================= Types ================= */

type CreateMode = "typed" | "drawn";

interface RecipientItemsProps {
  component: DroppingField;
  onClose: () => void;
  onAdd: (value: SignatureInitial) => void;
  value?: string | null;
}

/* ================= Constants ================= */

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 150;

/* ================= Component ================= */

const RecipientItems: React.FC<
  RecipientItemsProps
> = ({ component, onClose, onAdd, value }) => {
  const canvasRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createMode, setCreateMode] = useState<CreateMode>("drawn");
  const [typedValue, setTypedValue] = useState("");
  const [drawnValue, setDrawnValue] = useState<string | null>(null);

  const isSignature = component?.component === "Signature";
  const isStamp = component?.component === "Stamp";
  const isInitial = component?.component === "Initials";

  /* ================= Capability Rules ================= */

  const allowTyped = isInitial;
  const allowDrawn = isInitial || isSignature;
  const allowUpload = isSignature || isStamp;

  /* ================= Handlers ================= */

  const handleCanvasEnd = () => {
    if (!canvasRef.current || canvasRef.current.isEmpty()) return;
    setDrawnValue(
      canvasRef.current.getTrimmedCanvas().toDataURL("image/png")
    );
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onAdd({
        id: uuidv4(),
        type: "drawn",
        value: reader.result as string,
        isDefault: false
      });
      onClose();
    };

    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (createMode === "typed" && typedValue) {
      onAdd({
        id: uuidv4(),
        type: "typed",
        value: typedValue,
        isDefault: false
      });
      onClose();
    }

    if (createMode === "drawn" && drawnValue) {
      onAdd({
          id: uuidv4(),
          type: "drawn",
          value: drawnValue,
          isDefault: false
      });
      
      onClose();
    }
  };
 useRenderCanvas(canvasRef, value ?? undefined);
  /* ================= Render ================= */
  return (
    <Modal
      visible
      title={`Add ${
        isSignature ? "Signature" : isStamp ? "Stamp" : "Initials"
      }`}
      onClose={onClose}
      handleCancel={onClose}
      handleConfirm={handleConfirm}
      ConfirmLabel="Use"
      width="700px"
    >
      {/* MODE SWITCH */}
      {!isStamp && (
        <div className="flex gap-4 mb-4">
          {allowTyped && (
            <Button
              inverted
              icon={<Type />}
              label="Type"
              onClick={() => setCreateMode("typed")}
              className={`flex-1 ${
                createMode === "typed" && "!bg-gray-200"
              }`}
            />
          )}

          {allowDrawn && (  
            <Button
              inverted
              icon={<LineSquiggle />}
              label="Draw"
              onClick={() => setCreateMode("drawn")}
              className={`flex-1 ${ 
                createMode === "drawn" && "!bg-gray-200"
              }`}
            />
          )}
        </div>
      )}

      {/* TYPED */}
      {createMode === "typed" && allowTyped && (
        <>
          <Input
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            className="text-center mb-3"
            placeholder="Your Initials"
          />
          <div className="flex h-32 items-center justify-center border border-dashed rounded-md bg-gray-50">
            <span
              className="text-5xl"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              {typedValue}
            </span>
          </div>
        </>
      )}

      {/* DRAWN */}
      {createMode === "drawn" && allowDrawn && (
        <div className="rounded-md border border-dashed border-gray-300 my-3">
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
          <div className="flex justify-end border-t bg-gray-50 p-2">
            <Button
              inverted
              label="Clear"
              onClick={() => {
                canvasRef.current?.clear();
                setDrawnValue(null);
              }}
              className="!text-xs"
            />
          </div>
        </div>
      )}

      {/* UPLOAD */}
      {allowUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={handleUpload}
          />
          <Button
            inverted
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border border-dashed p-6 ${
              isStamp && "h-48"
            }`}
          >
            <div className="flex items-center gap-4">
              <Signature size={36} />
              <div>
                <strong>
                  Upload {isStamp ? "Stamp" : "Signature"}
                </strong>
                <p className="text-sm text-gray-600">
                  Upload an image file
                </p>
              </div>
            </div>
          </Button>
        </>
      )}

      <Button
        inverted
        icon={<ArrowLeft size={16} />}
        label="Back"
        onClick={onClose}
        className="absolute bottom-4 left-4"
      />
    </Modal>
  );
};

export default RecipientItems;

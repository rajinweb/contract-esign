"use client";

import { useRenderCanvas } from "@/hooks/useRenderCanvas";
import React, { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface InitialsProps {
  value?: string | null;
  readOnly?: boolean;
  width?: number;
  height?: number;
  className?:string
}

const Initials: React.FC<InitialsProps> = ({
  value,
  readOnly = true,
  width = 150,
  height = 50,
  className
}) => {
  const canvasRef = useRef<SignatureCanvas>(null)
  useRenderCanvas(canvasRef, value ?? undefined, width, height);

  // Prevent drawing if readOnly
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <SignatureCanvas
      ref={canvasRef}
      penColor="black"
      canvasProps={{
        width,
        height,
        className: `bg-white w-full h-full rounded pointer-events-none ${className}`,
        onMouseDown: handleMouseDown,
      }}
    />
  );
};

export default Initials;

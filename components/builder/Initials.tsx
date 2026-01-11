"use client";

import React, { useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface InitialsProps {
  value?: string | null;
  readOnly?: boolean;
  width?: number;
  height?: number;
}

const Initials: React.FC<InitialsProps> = ({
  value,
  readOnly = true,
  width = 150,
  height = 50
}) => {
  const canvasRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!value) return;

    // Draw image if value is a base64 image
    if (value.startsWith("data:image")) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      return;
    }

    // Draw typed initials
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Auto-fit font to canvas
    let fontSize = Math.min(canvas.width, canvas.height); // start big
    do {
      ctx.font = `${fontSize}px 'Dancing Script', cursive`;
      const textWidth = ctx.measureText(value).width;
      fontSize -= 2; // shrink until it fits
    } while (ctx.measureText(value).width > canvas.width * 0.8 && fontSize > 10);

    ctx.fillText(value, canvas.width / 2, canvas.height / 2);
  }, [value, width, height]);

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
        className: "bg-white w-full h-full rounded pointer-events-none",
        onMouseDown: handleMouseDown,
      }}
    />
  );
};

export default Initials;

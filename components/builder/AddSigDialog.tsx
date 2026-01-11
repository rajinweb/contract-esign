'use client';
import SignatureCanvas from "react-signature-canvas";
import { useEffect, useRef } from "react";
import Modal from "../Modal";
import { Button } from "../Button";
import { isCanvasBlank } from "@/utils/utils";

interface AddSigDialogProps {
  onConfirm: (sigURL: string) => void;
  onClose: () => void;
  autoDate: boolean;
  setAutoDate: (value: boolean) => void;
  value?: string | null;
}

export function AddSigDialog({ onConfirm, onClose, autoDate, setAutoDate, value }: AddSigDialogProps) {
  const canvasRef = useRef<SignatureCanvas | null>(null);

  const handleConfirm = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current.getCanvas(); 
      if (canvas && isCanvasBlank(canvas)) {
        onConfirm("");
        return;
      }else{
        onConfirm(canvas.toDataURL());
      }
    }
  };
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
  }, [value]);

  return (
    <Modal
     visible
      title={"Draw your signature"}
      onClose={() => onClose()}
      handleCancel={onClose}
      handleConfirm={handleConfirm} 
      width="700px"
      >
        <SignatureCanvas
            ref={canvasRef}
            canvasProps={{ width: 665, height: 200 }}
            onEnd={() => value && canvasRef.current?.getTrimmedCanvas().toDataURL("image/png")}
          />
         
          <label className="flex justify-between absolute gap-1 bottom-6 items-center">
            <input
              type={"checkbox"}
              checked={autoDate}
              onChange={(e) => setAutoDate(e.target.checked)}
              className="ml-2"
            /> Auto date/time
          </label>     
           <Button
              inverted
              label="Clear"
              onClick={() => {
                canvasRef.current?.clear();
              }}
              className="!text-xs !py-1"
            />
        
        
     
    </Modal>
  );
}

'use client';
import { Dialog } from "../Dialog";
import SignatureCanvas from "react-signature-canvas";
import { useRef } from "react";

interface AddSigDialogProps {
  onConfirm: (sigURL: string) => void;
  onClose: () => void;
  autoDate: boolean;
  setAutoDate: (value: boolean) => void;
}

export function AddSigDialog({ onConfirm, onClose, autoDate, setAutoDate }: AddSigDialogProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);

  const handleConfirm = () => {
    if (sigRef.current) {
      const sigURL = sigRef.current.getCanvas().toDataURL(); 
      onConfirm(sigURL);
    }
  };

  return (
    <Dialog
      isVisible={true}
      title={"Add signature"}
      onCancel={onClose}
      onConfirm={handleConfirm} 
      >
        <SignatureCanvas
            velocityFilterWeight={1}
            ref={sigRef}
            canvasProps={{
              width: 600,
              height: 200,
              className: "sigCanvas border border-2",
            }}
          />

      {/* Instructions */}
      <div className="flex justify-between text-center text-gray-600 py-4">
          <div>
            Auto date/time
            <input
              type={"checkbox"}
              checked={autoDate}
              onChange={(e) => setAutoDate(e.target.checked)}
              className="ml-2"
            />
          </div>
          <div>Draw your signature above</div>
        </div>
    </Dialog>
  );
}

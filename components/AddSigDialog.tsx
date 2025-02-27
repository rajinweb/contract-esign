'use client';
import { Dialog } from "./Dialog";
import SignatureCanvas from "react-signature-canvas";
import { useRef } from "react";

export function AddSigDialog({ onConfirm, onClose, autoDate, setAutoDate }) {
  const sigRef = useRef(null);

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

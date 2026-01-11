import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string; // e.g. "400px", "600px", "90%"
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  handleCancel?: () => void; 
  handleConfirm?: () => void;
  ConfirmLabel?: string;
  CancelLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  width = "400px",
  closeOnBackdrop = true,
  closeOnEsc = false,
  handleConfirm,
  handleCancel,
  ConfirmLabel = "Confirm",
  CancelLabel = "Cancel",
}) => {
  // ESC key support
  useEffect(() => {
    if (!visible || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [visible, closeOnEsc, onClose]);

  if (!visible || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl "
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className="flex justify-between p-4 border-b">
          {title ? <h3 className="font-semibold leading-8">{title}</h3> : <div />}
          <Button onClick={onClose} inverted aria-label="Close modal" className="flex items-top" icon={<X size={16} />}/>
        </header>
        {/* Content */}
        <div className="p-4">{children}</div>
        {/* Footer */}
        {handleConfirm &&
         <footer className="flex justify-end gap-2 p-4 bg-gray-50 border-t rounded-b-[inherit]">
          <Button onClick={()=>{
            if(handleCancel){
               handleCancel();
             }
            onClose()}} label={CancelLabel} inverted/>
          <Button onClick={handleConfirm} label={ConfirmLabel}/>
        </footer>
        }
      </div>
    </div>,
    document.body
  );
};

export default Modal;
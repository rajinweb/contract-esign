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
  handleCancel
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
        <header className="flex justify-between mb-3 p-4 border-b">
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : <div />}
          <button onClick={onClose} aria-label="Close modal" className="flex items-top">
            <X className="h-4 w-4 text-gray-500 hover:text-gray-800" />
          </button>
        </header>
        {/* Content */}
        <div>{children}</div>
        {/* Footer */}
        {handleConfirm &&
         <footer className="flex justify-end gap-2 p-4 bg-gray-50 border-t rounded-b-[inherit]">
          <Button onClick={()=>{
            if(handleCancel){
               handleCancel();
             }
            onClose()}} label="Cancel"/>
          <Button onClick={handleConfirm} label="Confirm"/>
        </footer>
        }
      </div>
    </div>,
    document.body
  );
};

export default Modal;
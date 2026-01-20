import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  width?: string; // e.g. "400px", "600px", "90%"
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  handleCancel?: () => void;
  handleConfirm?: () => void;
  confirmLabel?: string | React.ReactNode;
  cancelLabel?: string | React.ReactNode;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmClass?: string;
  cancelClass?: string;
  cancelIcon?: React.ReactNode;
  confirmIcon?: React.ReactNode;
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
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmDisabled,
  cancelDisabled,
  confirmClass,
  cancelClass,
  cancelIcon,
  confirmIcon
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
          {title ? <div className="font-semibold leading-8">{title}</div> : <div />}
          <Button onClick={onClose} inverted aria-label="Close modal" className="flex items-top" icon={<X size={16} />} />
        </header>
        {/* Content */}
        <main className="p-4 overflow-auto max-h-[60vh]">{children}</main>
        {/* Footer */}
        {handleConfirm &&
          <footer className="flex justify-end gap-2 p-4 bg-gray-50 border-t rounded-b-[inherit]">
            <Button onClick={() => {
              if (handleCancel) {
                handleCancel();
              }
              onClose()
            }} inverted disabled={cancelDisabled} className={cancelClass} icon={cancelIcon}>{cancelLabel}</Button>
            <Button onClick={handleConfirm} disabled={confirmDisabled} className={confirmClass} icon={confirmIcon}>{confirmLabel}</Button>
          </footer>
        }
      </div>
    </div>,
    document.body
  );
};

export default Modal;
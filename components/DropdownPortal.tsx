import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface DropdownPortalProps {
  children: React.ReactNode;
  targetId: string;
  dropdown: string | null;
  onClose?: () => void; // optional callback when clicking outside
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ children, targetId, dropdown, onClose }) => {
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Update position whenever dropdown or target changes
    useEffect(() => {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }, [targetId, dropdown]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        targetId && !document.getElementById(targetId)?.contains(e.target as Node)
      ) {
        if (onClose) onClose();
      }
    };

    if (dropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown, targetId, onClose]);

    if (typeof window === 'undefined' || !dropdown) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 9999
        }}
      >
        {children}
      </div>,
      document.body
    );
  };
  DropdownPortal.displayName = "DropdownPortal";
  export default DropdownPortal;
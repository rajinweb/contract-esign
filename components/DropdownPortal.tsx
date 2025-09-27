import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

 // Portal component for dropdown
  const DropdownPortal = ({ children, targetId, dropdown }: { children: React.ReactNode, targetId: string, dropdown:string | null }) => {
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    
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

    if (typeof window === 'undefined') return null;
    
    return createPortal(
      <div 
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
'use client';
import React from 'react';

interface PopoverProps {
  children: React.ReactNode;
  trigger: React.RefObject<HTMLElement>;
  visible: boolean;
}

const Popover: React.FC<PopoverProps> = ({ children, trigger, visible }) => {
  if (!visible || !trigger.current) return null;

  const rect = trigger.current.getBoundingClientRect();

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs text-red-600"
      style={{
        top: rect.top - rect.height - 10,
        left: rect.left,
        transform: 'translateY(-100%)',
      }}
    >
      {children}
    </div>
  );
};

export default Popover;

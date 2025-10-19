'use client';
import React from 'react';
import { X } from 'lucide-react';
import { Button } from "./Button";

interface DialogProps {
  isVisible: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmTitle?: string;
  hideCancel?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Dialog({
  isVisible,
  title,  
  onCancel,
  onConfirm,
  confirmTitle = "Confirm",
  hideCancel,
  disabled,
  children
}: DialogProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bg-black bg-opacity-20 z-50 top-0 left-0 w-full h-full">
      <div
        className={`bg-white p-4 pt-0 absolute z-20 w-min-52 transform left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg`}
      >
        <div className="bg-blue-500 flex justify-between items-center p-3 -mx-4 mb-4 text-white">
          {title}
          <X
            size={20}
            className="cursor-pointer"
            onClick={onCancel}
            strokeWidth={3}
          />
        </div>
        {children}
        <div className='flex justify-end'>
           {!hideCancel && (
                  <Button
                    label={"Cancel"}
                    onClick={onCancel}
                  />
                )}
                <Button label={confirmTitle} inverted onClick={onConfirm} disabled={disabled}/>
        </div>
      </div>
    </div>
  );
}

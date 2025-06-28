import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import LoginPage from '../app/login/page';
import { X } from 'lucide-react';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose }) => {
  if (!visible) {
    return null;
  }

  // Render modal using portal
  if (typeof window === "undefined" || !document.body) {
    return null;
  }
  return createPortal(
    <div className="z-[999999] fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center" data-testid="login-modal">
     <div className='relative w-[400px]'>
        <X className="absolute top-2 right-2 cursor-pointer text-blue-500 hover:text-blue-800" onClick={onClose}/>
        <LoginPage  />
      </div>
    </div>,
    document.body
  );
};

export default LoginModal;
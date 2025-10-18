"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DeletedDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeletedDocumentDialog: React.FC<DeletedDocumentDialogProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) return;

    if (countdown === 0) {
      router.push('/dashboard');
      onClose(); // Close the dialog after redirecting
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Document Deleted</h2>
        <p className="mb-6">This document has been deleted. You will be redirected to the dashboard in {countdown} seconds.</p>
      </div>
    </div>
  );
};

export default DeletedDocumentDialog;

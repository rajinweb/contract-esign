'use client';

import React from 'react';
import TemplatePreview, { TemplatePreviewProps } from './TemplatePreview';

export interface TemplatePreviewModalProps extends Omit<TemplatePreviewProps, 'onClose'> {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplatePreviewModal({
  isOpen,
  onClose,
  templateUrl,
  templateName,
}: TemplatePreviewModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="relative w-full max-w-4xl h-full max-h-[90vh]">
        <TemplatePreview templateUrl={templateUrl} templateName={templateName} onClose={onClose} />
      </div>
    </div>
  );
}
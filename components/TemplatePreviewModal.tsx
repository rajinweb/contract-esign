'use client';

import TemplatePreview, { TemplatePreviewProps } from './TemplatePreview';
import Modal from './Modal';

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
    <Modal visible={isOpen} onClose={onClose} title={templateName} className='w-[900px]'>
      <TemplatePreview templateUrl={templateUrl} templateName={templateName} onClose={onClose} />
    </Modal>
  );
}

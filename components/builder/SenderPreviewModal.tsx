"use client";
import dynamic from 'next/dynamic';
import { SigningViewDocument } from '@/types/types';
import Modal from '../Modal';

const PreviewSignPageClient = dynamic(() => import('@/app/sign/[token]/SignPageClient'), {
  ssr: false,
});

interface SenderPreviewModalProps {
  visible: boolean;
  previewDocument: SigningViewDocument | null;
  onClose: () => void;
}

const SenderPreviewModal: React.FC<SenderPreviewModalProps> = ({
  visible,
  previewDocument,
  onClose,
}) => {
  if (!visible || !previewDocument) return null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      closeOnEsc
      className="sender-preview-modal"
    >
      <PreviewSignPageClient previewMode previewDocument={previewDocument} />
    </Modal>
  );
};

export default SenderPreviewModal;

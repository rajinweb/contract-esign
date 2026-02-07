import React from 'react';
import Modal from '../Modal';
import { CircleCheck } from 'lucide-react';

interface DocumentSendConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToDashboard: () => void;
  onVoidAndCreateRevision: () => void;
}

const DocumentSendConfirmationModal: React.FC<DocumentSendConfirmationModalProps> = ({
  visible,
  onClose,
  onGoToDashboard,
  onVoidAndCreateRevision,
}) => {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Document sent"
      width="520px"
      cancelLabel="Go to Dashboard"
      confirmLabel="Void & Create New Revision"
      handleConfirm={onVoidAndCreateRevision}
      handleCancel={onGoToDashboard}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700 flex items-center gap-4 justify-center p-4">
          <CircleCheck size={30} className="text-green-600" />
          The document has been sent successfully.
        </p>
      </div>
    </Modal>
  );
};

export default DocumentSendConfirmationModal;

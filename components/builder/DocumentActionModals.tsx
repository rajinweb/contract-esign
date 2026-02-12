'use client';
import React from 'react';
import { IDocument } from '@/types/types';
import Modal from '../Modal';

interface DocumentActionModalsProps {
  documentStatus?: string | null;
  showVoidModal: boolean;
  setShowVoidModal: React.Dispatch<React.SetStateAction<boolean>>;
  isVoiding: boolean;
  onVoidAndDerive: () => void;

  showDeriveModal: boolean;
  setShowDeriveModal: React.Dispatch<React.SetStateAction<boolean>>;
  isDeriving: boolean;
  onDeriveDocument: () => void;

  showAuditModal: boolean;
  setShowAuditModal: React.Dispatch<React.SetStateAction<boolean>>;
  signingEvents: NonNullable<IDocument['signingEvents']>;
}

const DocumentActionModals: React.FC<DocumentActionModalsProps> = ({
  documentStatus,
  showVoidModal,
  setShowVoidModal,
  isVoiding,
  onVoidAndDerive,
  showDeriveModal,
  setShowDeriveModal,
  isDeriving,
  onDeriveDocument,
  showAuditModal,
  setShowAuditModal,
  signingEvents,
}) => {
  const deriveMessage = (() => {
    switch (documentStatus) {
      case 'rejected':
        return 'This signing request was rejected and is now read-only. Any modification will create a new document with a new signing cycle. The original document will remain unchanged.';
      case 'voided':
        return 'This signing request was voided and is now read-only. Any modification will create a new document with a new signing cycle. The original document will remain unchanged.';
      case 'completed':
        return 'This document has been fully signed and cannot be changed. Any modification will create a new document with a new signing cycle. The original document will remain unchanged.';
      default:
        return 'This document is read-only. Any modification will create a new document with a new signing cycle. The original document will remain unchanged.';
    }
  })();

  return (
    <>
      <Modal
        visible={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        title="Void current signing request?"
        handleConfirm={onVoidAndDerive}
        confirmLabel="Void & Create New Revision"
        cancelLabel="Cancel"
        confirmDisabled={isVoiding}
      >
        <p className="text-sm text-gray-700">
          This document has an active signing request. Voiding will stop the current signing flow and
          create a new document with a fresh signing cycle. The original document will remain
          unchanged.
        </p>
      </Modal>

      <Modal
        visible={showDeriveModal}
        onClose={() => setShowDeriveModal(false)}
        title="Create a new signing request?"
        handleConfirm={onDeriveDocument}
        confirmLabel="Create New Document"
        cancelLabel="Cancel"
        confirmDisabled={isDeriving}
      >
        <p className="text-sm text-gray-700">
          {deriveMessage}
        </p>
      </Modal>

      <Modal
        visible={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="Audit trail"
      >
        {signingEvents.length === 0 ? (
          <p className="text-sm text-gray-500">No audit events available.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {signingEvents.map((event, index) => (
              <div key={`${event?.recipientId || 'event'}-${index}`} className="border rounded-md p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">
                    {String(event?.action || 'event').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {event?.signedAt
                      ? new Date(event.signedAt).toLocaleString()
                      : event?.sentAt
                        ? new Date(event.sentAt).toLocaleString()
                        : event?.serverTimestamp
                          ? new Date(event.serverTimestamp).toLocaleString()
                          : '—'}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Recipient: {event?.recipientId || 'unknown'}
                </div>
                <div className="text-xs text-gray-600">
                  Version: {event?.version ?? '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};

export default DocumentActionModals;

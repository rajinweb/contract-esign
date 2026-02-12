import React from 'react';
import { Button } from '../Button';

interface DocumentStatusBarsProps {
  isSigningMode: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  isSent: boolean;
  isVoided: boolean;
  isRejected: boolean;
  isReadOnly: boolean;
  derivedFromDocumentId?: string | null;
  derivedFromVersion?: number | null;
  isDeriving: boolean;
  isDownloadingSigned: boolean;
  isVoiding: boolean;
  onShowAudit: () => void;
  onDownloadSigned: () => void;
  onShowDerive: () => void;
  onShowVoid: () => void;
}

const DocumentStatusBars: React.FC<DocumentStatusBarsProps> = ({
  isSigningMode,
  isCompleted,
  isInProgress,
  isSent,
  isVoided,
  isRejected,
  isReadOnly,
  derivedFromDocumentId,
  derivedFromVersion,
  isDeriving,
  isDownloadingSigned,
  isVoiding,
  onShowAudit,
  onDownloadSigned,
  onShowDerive,
  onShowVoid,
}) => {
  if (isSigningMode) return null;

  return (
    <>
      {isCompleted && (
        <div className="flex items-center justify-between bg-white border-b px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-green-700 font-semibold">Completed</div>
            <div className="text-sm text-gray-700">
              This document is completed and cannot be modified.
            </div>
            {derivedFromDocumentId && (
              <div className="text-xs text-gray-500 mt-1">
                Derived from {derivedFromDocumentId}
                {derivedFromVersion != null ? ` (v${derivedFromVersion})` : ''}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onShowAudit}
              inverted
              className="!rounded-full"
            >
              View audit trail
            </Button>
            <Button
              onClick={onDownloadSigned}
              inverted
              className="!rounded-full"
              disabled={isDownloadingSigned}
            >
              Download signed PDF
            </Button>
            <Button
              onClick={onShowDerive}
              className="!rounded-full"
              disabled={isDeriving}
            >
              Modify &amp; Create New Signing Request
            </Button>
          </div>
        </div>
      )}

      {isInProgress && (
        <div className="flex items-center justify-between bg-amber-50 border-b px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold">In Progress</div>
            <div className="text-sm text-amber-700">
              Signing is in progress. To modify this document, void the current request and create a new signing cycle.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onShowAudit}
              inverted
              className="!rounded-full"
            >
              View audit trail
            </Button>
            <Button
              onClick={onShowVoid}
              className="!rounded-full"
              disabled={isVoiding}
            >
              Void &amp; Create New Revision
            </Button>
          </div>
        </div>
      )}

      {isSent && !isInProgress && (
        <div className="flex items-center justify-between bg-blue-50 border-b px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Sent</div>
            <div className="text-sm text-blue-700">
              This document has an active signing request and is read-only. To make changes, void the request and start a new signing cycle.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onShowAudit}
              inverted
              className="!rounded-full"
            >
              View audit trail
            </Button>
            <Button
              onClick={onShowVoid}
              className="!rounded-full"
              disabled={isVoiding}
            >
              Void &amp; Create New Revision
            </Button>
          </div>
        </div>
      )}

      {isVoided && (
        <div className="flex items-center justify-between bg-slate-50 border-b px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-700 font-semibold">Voided</div>
            <div className="text-sm text-slate-600">
              This document has been voided and is read-only.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onShowAudit}
              inverted
              className="!rounded-full"
            >
              View audit trail
            </Button>
            <Button
              onClick={onShowDerive}
              className="!rounded-full"
              disabled={isDeriving}
            >
              Create New Signing Request
            </Button>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="flex items-center justify-between bg-red-50 border-b px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-red-700 font-semibold">Rejected</div>
            <div className="text-sm text-red-700">
              This signing request was rejected and is now read-only.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onShowAudit}
              inverted
              className="!rounded-full"
            >
              View audit trail
            </Button>
            <Button
              onClick={onShowDerive}
              className="!rounded-full"
              disabled={isDeriving}
            >
              Create New Signing Request
            </Button>
          </div>
        </div>
      )}

      {derivedFromDocumentId && !isReadOnly && (
        <div className="flex items-center justify-between bg-slate-50 border-b px-4 py-1 text-xs text-gray-600">
          <div>
            Derived from {derivedFromDocumentId}
            {derivedFromVersion != null ? ` (v${derivedFromVersion})` : ''}
          </div>
          <div className="text-gray-500">Draft</div>
        </div>
      )}
    </>
  );
};

export default DocumentStatusBars;

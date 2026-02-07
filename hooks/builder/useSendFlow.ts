"use client";
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recipient } from '@/types/types';

interface UseSendFlowArgs {
  isAlreadySent: boolean;
  setShowVoidModal: React.Dispatch<React.SetStateAction<boolean>>;
  setDocumentStatus: React.Dispatch<React.SetStateAction<string | null>>;
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>;
}

export const useSendFlow = ({
  isAlreadySent,
  setShowVoidModal,
  setDocumentStatus,
  setRecipients,
}: UseSendFlowArgs) => {
  const router = useRouter();
  const [showSendDocument, setShowSendDocument] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  const handleSendComplete = useCallback(
    (payload: { recipients: Recipient[]; signingMode: 'sequential' | 'parallel' }) => {
      setDocumentStatus('sent');
      const sentRecipients = Array.isArray(payload?.recipients) ? payload.recipients : [];

      if (sentRecipients.length > 0) {
        const signingMode = payload.signingMode;
        let nextOrder: number | null = null;
        if (signingMode === 'sequential') {
          const orders = sentRecipients
            .filter(r => r.role !== 'viewer')
            .map(r => r.order)
            .filter((order): order is number => typeof order === 'number' && !Number.isNaN(order));
          nextOrder = orders.length > 0 ? Math.min(...orders) : null;
        }

        setRecipients(prev => {
          return sentRecipients.map(r => {
            const existing = prev.find(p => p.id === r.id);
            const status =
              signingMode === 'sequential' && r.role !== 'viewer'
                ? (nextOrder !== null && r.order === nextOrder ? 'sent' : 'pending')
                : 'sent';
            return {
              ...existing,
              ...r,
              status,
              signingToken: existing?.signingToken ?? r.signingToken ?? '',
            };
          });
        });
      }

      setShowSendDocument(false);
      setShowSendConfirmation(true);
    },
    [setRecipients, setDocumentStatus]
  );

  const handleGoToDashboard = useCallback(() => {
    setShowSendConfirmation(false);
    router.push('/dashboard');
  }, [router]);

  const handleVoidFromConfirmation = useCallback(() => {
    setShowSendConfirmation(false);
    setShowVoidModal(true);
  }, [setShowVoidModal]);

  const handleOpenSendModal = useCallback(() => {
    if (isAlreadySent) {
      setShowVoidModal(true);
      return;
    }
    setShowSendDocument(true);
  }, [isAlreadySent, setShowVoidModal]);

  return {
    showSendDocument,
    setShowSendDocument,
    showSendConfirmation,
    setShowSendConfirmation,
    handleSendComplete,
    handleGoToDashboard,
    handleVoidFromConfirmation,
    handleOpenSendModal,
  };
};

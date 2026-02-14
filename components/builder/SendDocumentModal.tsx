'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {  Send, Clock, AlertCircle, MapPin } from 'lucide-react';
import { DroppedComponent, Recipient } from '@/types/types';
import toast from 'react-hot-toast';
import Input from '../forms/Input';
import Modal from '../Modal';
import RecipientsList from './RecipientsList';

interface SendDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  fields?: DroppedComponent[];
  documentName: string;
  documentId?: string | null;
  onSendComplete?: (payload: { recipients: Recipient[]; signingMode: 'sequential' | 'parallel' }) => void;
  setRecipients?: (recipients: Recipient[]) => void;
}

const SendDocumentModal: React.FC<SendDocumentModalProps> = ({
  isOpen,
  onClose,
  recipients,
  fields = [],
  setRecipients,
  documentName,
  documentId,
  onSendComplete,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [subject, setSubject] = useState(`Signature Request – ${documentName}`);
  const [message, setMessage] = useState(`You have been requested to review and sign the following document:\n\n ${documentName}`);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [expiryDays, setExpiryDays] = useState(30);
  const [hasExpiry, setHasExpiry] = useState(true);
  const [captureGps, setCaptureGps] = useState(false);
  const [sequential, setSequential] = useState(false);
  const sequentialAllowed = recipients.length > 1;
  const fieldStats = useMemo(() => {
    const stats: Record<string, { total: number; required: number }> = {};
    fields.forEach((field) => {
      if (field.fieldOwner === 'me') return;
      const assignedRecipientId = field.assignedRecipientId?.trim();
      if (!assignedRecipientId) return;
      if (!stats[assignedRecipientId]) {
        stats[assignedRecipientId] = { total: 0, required: 0 };
      }
      stats[assignedRecipientId].total += 1;
      if (field.required !== false) {
        stats[assignedRecipientId].required += 1;
      }
    });
    return stats;
  }, [fields]);

  useEffect(() => {
    if (!sequentialAllowed && sequential) {
      setSequential(false);
    }
  }, [sequentialAllowed, sequential]);


  const nonSigners = recipients.filter((r) => r.role !== 'signer');
  const handleReorder = (reorderedSigners: Recipient[]) => {
    const merged = [...reorderedSigners, ...nonSigners].map((r, idx) => ({
      ...r,
      order: idx + 1,
    }));
    setRecipients?.(merged);
  };
  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('No recipients to send to');
      return;
    }

    if (!documentId) {
      toast.error('Document must be saved before sending');
      return;
    }

    setIsSending(true);
    try {
      const recipientsWithSettings = recipients.map((r, index) => ({
        ...r,
        order: index + 1,
        sendReminders: sendReminders,
        reminderDays: sendReminders ? reminderDays : undefined,
        expiresAt: hasExpiry ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined,
        captureGpsLocation: captureGps,
      }));

      const response = await fetch('/api/documents/send-for-signing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          documentName,
          recipients: recipientsWithSettings,
          subject,
          message,
          signingMode: sequential ? 'sequential' : 'parallel',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send document');
      }
      toast.success(`Document sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`);
      onSendComplete?.({
        recipients: recipientsWithSettings,
        signingMode: sequential ? 'sequential' : 'parallel',
      });
      onClose();
    } catch (error) {
      console.error('Error sending document:', error);
      toast.error('Failed to send document. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const signers = recipients.filter((r) => r.role === 'signer' && !r.isCC);
  const ccRecipients = recipients.filter(r => r.isCC);

  return (
    <Modal visible={isOpen}
      onClose={onClose}
      handleConfirm={handleSend}
      confirmLabel={isSending ? 'Sending...' : 'Send Document'}
      confirmClass={`${isSending && '[&_span]:animate-spin'} min-w-44`}
      confirmDisabled={isSending || recipients.length === 0}
      confirmIcon={<Send size={16} className='mr-2' />}
      cancelDisabled={isSending}
      className='w-[800px]' title={
        <>
          <h2 className="text-xl font-semibold text-gray-900">
            Send Document
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Send &quot;{documentName}&quot; to {recipients.length} recipient{recipients.length > 1 ? 's' : ''}
          </p>
        </>
      }>
      <div className="p-4 space-y-6">
        {/* Recipients Summary */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-3">Recipients</h3>

          <div className="flex items-center justify-between mb-3">
            <div>
                <h4 className="text-sm font-medium text-gray-900">Sequential Signing</h4>
                <p className="text-xs text-gray-500">
                  Signers must sign in a specific order. You can re-order signers below.
                </p>
                {!sequentialAllowed && (
                  <p className="text-xs text-amber-600 mt-1">
                    Sequential signing is available only when there is more than one recipient.
                  </p>
                )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    id="sequential-signing-modal"
                    className="sr-only peer"
                    checked={sequential}
                    onChange={() => setSequential(!sequential)}
                    disabled={!sequentialAllowed}
                />
                <div className="w-11 h-6 scale-75 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>


          {signers.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-blue-600 font-medium mb-2">SIGNERS ({signers.length})</p>
              <div className="space-y-1">
                <RecipientsList
                  recipients={signers}
                  isDraggable={sequential}
                  onReorder={handleReorder}
                  inlineView
                  fieldStats={fieldStats}
                />
              </div>
            </div>
          )}

          {ccRecipients.length > 0 && (
            <div>
              <p className="text-xs text-blue-600 font-medium mb-2">CC RECIPIENTS ({ccRecipients.length})</p>
              <div className="space-y-1">
                {ccRecipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                      CC
                    </div>
                    <span className="font-medium">{recipient.name}</span>
                    <span className="text-gray-600">({recipient.email})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Subject
            </label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message to recipients"
            />
          </div>
        </div>

        {/* Reminder Settings */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Automatic Reminders</h3>
              <p className="text-xs text-gray-500">Send reminders to recipients who haven&apos;t signed</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sendReminders}
                onChange={(e) => setSendReminders(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
          </div>

          {sendReminders && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Send reminder every</span>
              <select
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={1}>1 day</option>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={7}>1 week</option>
              </select>
              <span className="text-sm text-gray-600">until signed</span>
            </div>
          )}
        </div>

        {/* Expiry Settings */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Document Expiry</h3>
              <p className="text-xs text-gray-500">Set when the signing link expires</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
          </div>

          {hasExpiry && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Expires in</span>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <span className="text-sm text-gray-600">from now</span>
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Security Settings</h3>
              <p className="text-xs text-gray-500">Enhance document security and audit trails</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Capture signer&apos;s GPS location</span>
            <div className="flex-grow"></div>
            <input
              type="checkbox"
              checked={captureGps}
              onChange={(e) => setCaptureGps(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Warning for incomplete document */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Before Sending</h4>
              <p className="text-sm text-amber-700 mt-1">
                Make sure all required fields are placed on the document and assigned to recipients.
                Once sent, recipients will receive signing instructions via email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SendDocumentModal;

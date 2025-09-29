'use client';
import React, { useState } from 'react';
import { X, Send, Clock, AlertCircle } from 'lucide-react';
import { Recipient } from '@/types/types';
import toast from 'react-hot-toast';

interface SendDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  documentName: string;
  onSendComplete: () => void;
}

const SendDocumentModal: React.FC<SendDocumentModalProps> = ({
  isOpen,
  onClose,
  recipients,
  documentName,
  onSendComplete,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [subject, setSubject] = useState(`Please sign: ${documentName}`);
  const [message, setMessage] = useState(`Hi,\n\nPlease review and sign the attached document: ${documentName}\n\nThank you!`);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('No recipients to send to');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/documents/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          documentName,
          subject,
          message,
          sendReminders,
          reminderDays,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send document');
      }

     // const result = await response.json();
      toast.success(`Document sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`);
      onSendComplete();
      onClose();
    } catch (error) {
      console.error('Error sending document:', error);
      toast.error('Failed to send document. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const signers = recipients.filter(r => !r.isCC);
  const ccRecipients = recipients.filter(r => r.isCC);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Send Document</h2>
            <p className="text-sm text-gray-500 mt-1">
              Send `&quot;`{documentName}`&ldquo;` to {recipients.length} recipient{recipients.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recipients Summary */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-3">Recipients</h3>
            
            {signers.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-blue-600 font-medium mb-2">SIGNERS ({signers.length})</p>
                <div className="space-y-1">
                  {signers.map((recipient) => (
                    <div key={recipient.id} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: recipient.color }}
                      >
                        {recipient.order}
                      </div>
                      <span className="font-medium">{recipient.name}</span>
                      <span className="text-gray-600">({recipient.email})</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {recipient.role}
                      </span>
                    </div>
                  ))}
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
              <input
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
                <p className="text-xs text-gray-500">Send reminders to recipients who haven`&apos;`t signed</p>
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

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || recipients.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendDocumentModal;
'use client';
import React, {useEffect, useRef, useState } from "react";
import { FileText, PenLine, CheckLine,
  Undo,
  Redo,
  Eye,
  Download,
  HelpCircle,
  ChevronDown,
  FolderIcon,
  History,
  LayoutDashboard,
  Keyboard,
  Globe,
  Star,
  Merge,
  LogOut,
  Save,
  Send,
  Heart
 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useRouter } from 'next/navigation';

import useContextStore from "@/hooks/useContextStore";
import MoreActions from "../MoreActionMenu";
import { HandleSavePDFOptions, Recipient, DroppedComponent } from "@/types/types";
import { downloadPdf, loadPdf, savePdfBlob } from '@/lib/pdf';
import toast, { Toaster } from 'react-hot-toast';
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { Button } from "../Button";

interface ActionToolBarProps {
  documentName: string;
  setDocumentName: React.Dispatch<React.SetStateAction<string>>;
  isEditingFileName: boolean;
  setIsEditingFileName: React.Dispatch<React.SetStateAction<boolean>>;
  handleSavePDF: (options: HandleSavePDFOptions) => Promise<boolean | null>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  recipients: Recipient[];
  onSendDocument: () => void;
  isAlreadySent?: boolean;
  onVoidAndDerive?: () => void;
  hasUnsavedChanges: boolean;
  droppedItems: DroppedComponent[];
  onSaveAsTemplate?: () => void;
  isLoggedIn?: boolean;
  setShowModal?: (show: boolean) => void;
  checkFieldError: (updater: (prev: DroppedComponent[]) => DroppedComponent[]) => void;
  onPreviewDocument?: () => void;
}  
const ActionToolBar: React.FC<ActionToolBarProps> = ({ 
  documentName,
  setDocumentName,
  isEditingFileName,
  setIsEditingFileName,
  handleSavePDF,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  recipients,
  onSendDocument,
  isAlreadySent = false,
  onVoidAndDerive,
  hasUnsavedChanges,
  droppedItems = [],
  onSaveAsTemplate,
  isLoggedIn = true,
  setShowModal,
  checkFieldError,
  onPreviewDocument,
}) => {
const hasSelfFields = droppedItems.some(item => item.fieldOwner === 'me');
const downloadDoc=async () => {
      if (!isLoggedIn) {
        setShowModal?.(true);
        return;
      }
      if (!selectedFile) return;
      const pdfDoc = await loadPdf(selectedFile as File | string );
      const blob = await savePdfBlob(pdfDoc);
      downloadPdf(blob, documentName);
  }
const menuItems = [
  { label: 'Save as Template', icon: Heart,  action:() => onSaveAsTemplate && onSaveAsTemplate()},
    { type: "divider", label: "" },
  { label: "Download original PDF", icon: Download, action:downloadDoc },
  { label: "Self‑Signed Download", icon: Merge, action: ()=> handleSavePDF({ isDownload: true, isMergeFields: true }), disabled: !hasSelfFields},
  { label: 'Download with History', icon: History },
  { label: 'History', icon: History },
  { type: 'divider' },
  { label: 'Import Fields from Other Documents', icon: FileText, subtext: 'Payment Request', subIcon: FileText },
  { label: 'Payment Request', icon: LayoutDashboard },
  { type: 'divider' },
  { label: 'Show Editing Tools', icon: LayoutDashboard, type: 'checkbox', checked: true },
  { label: 'Enable Field Snapping', icon: Keyboard, type: 'checkbox', checked: false },
  { type: 'divider' },
  { label: 'Keyboard Shortcuts', icon: Keyboard },
  { label: 'Language', icon: Globe },
  { type: 'divider' },
  { label: 'Support', icon: HelpCircle },
  { label: 'Upgrade Subscription', icon: Star, className: 'text-yellow-500' },
]; 
  const { selectedFile } = useContextStore();
  const [isUnsavedChangesDialogVisible, setIsUnsavedChangesDialogVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  


  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
 

  const [documentMetadata, setDocumentMetadata] = useState<{
    createdAt?: Date;
    author?: string;
    fileSize?: string;
    lastModified?: string;
  } | null>(null);

  useEffect(() => {
    if (isEditingFileName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingFileName]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!selectedFile) return;
  
      try {
        let arrayBuffer: ArrayBuffer;
        let fileSize: number | undefined;
        let lastModified: string | undefined;
  
        if (typeof selectedFile === "string") {
          console.log("Fetching metadata from:", selectedFile);
          const res = await fetch(selectedFile, { credentials: 'include' });
          if (!res.ok) {
            console.warn(`Failed to fetch file metadata from ${selectedFile}: ${res.status} ${res.statusText}`);
            setDocumentMetadata(null);
            return; // Don't treat this as a hard error – just skip metadata
          }
          
          arrayBuffer = await res.arrayBuffer();
        } else {
          arrayBuffer = await selectedFile.arrayBuffer();
          fileSize = selectedFile.size;
          lastModified = new Date(selectedFile.lastModified).toLocaleString();
        }
        if (arrayBuffer.byteLength === 0) {
             throw new Error("File content is empty.");
        }
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const createdAt = pdfDoc.getCreationDate();
        const author = pdfDoc.getAuthor();
  
        setDocumentMetadata({
          createdAt,
          author,
          fileSize: fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB` : undefined,
          lastModified,
        });
      } catch (err) {
        console.error("Failed to fetch metadata. Check file URL or integrity.", err);
        setDocumentMetadata(null);
      }
    };
  
    fetchMetadata();
  }, [selectedFile]);


 const validateAndSend = () => {
    const invalidFields: DroppedComponent[] = [];
    let hasRecipientFieldInvalid = false;
    let hasMeFieldInvalid = false;

    if (!hasAssignedRecipientFields) {
      toast.error("Assign at least one field to a recipient before sending.");
      return;
    }

    droppedItems.forEach((item) => {
      const assignedRecipientId = item.assignedRecipientId?.trim();
      const isRecipientFieldInvalid =
        item.fieldOwner !== "me" &&
        (!assignedRecipientId || !recipientIds.has(assignedRecipientId));
      const isMeFieldInvalid = item.fieldOwner === "me" && (!item.data?.length || item.data.trim() === "");

      if (isRecipientFieldInvalid) hasRecipientFieldInvalid = true;
      if (isMeFieldInvalid) hasMeFieldInvalid = true;

      if (isRecipientFieldInvalid || isMeFieldInvalid) {
        invalidFields.push({ ...item, hasError: true });
      }
    });

    if (invalidFields.length > 0) {
      // Update all invalid fields in state
      checkFieldError((prev) => [
        ...prev.filter((f) => !invalidFields.find((u) => u.id === f.id)),
        ...invalidFields,
      ]);

      // Show separate alerts
      if (hasRecipientFieldInvalid) {
        toast.error("All recipient fields must be assigned to an active recipient before sending.");
      }
      if (hasMeFieldInvalid) {
        toast.error("Fill in your input field(s) before sending.");
      }

      return;
    }

    onSendDocument();
  };

  const handleSave = async () => {
    if (!isLoggedIn) {
      setShowModal?.(true);
      return;
    }
    if (!hasUnsavedChanges) return;

    setSaveStatus('saving');
    try {
      const success = await handleSavePDF({ isServerSave: true });
      if (success === null) {
        setSaveStatus('idle');
        toast.error('Document not ready to save. Try again in a moment.');
        return;
      }
      if (success) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        toast.success('Saved ✓');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
        toast.error('Save failed. Please try again.');
      }
    } catch (error) {
      setSaveStatus('idle');
      toast.error('Error saving document. Please try again.');
      console.error(error);
    }
  };

  const handleSendClick = () => {
    if (!isLoggedIn) {
      setShowModal?.(true);
      return;
    }
    if (hasUnsavedChanges) {
      setIsUnsavedChangesDialogVisible(true);
    } else {
      validateAndSend();
    }
  };

  const handleSaveAndContinue = async () => {
    const success = await handleSavePDF({ isServerSave: true });
    if (success) {
      validateAndSend();
    } else {
      console.warn("PDF save failed, skipping send.");
    }
    setIsUnsavedChangesDialogVisible(false);
  };

  const recipientCount = recipients.length;
  const recipientIds = new Set(recipients.map((r) => r.id));
  const hasAssignedRecipientFields = droppedItems.some((item) => {
    const assignedRecipientId = item.assignedRecipientId?.trim();
    return (
      item.fieldOwner !== "me" &&
      assignedRecipientId &&
      recipientIds.has(assignedRecipientId)
    );
  });
  const isSendDisabled =
    isAlreadySent || recipientCount === 0 || hasUnsavedChanges || !hasAssignedRecipientFields;
  const sendTitle = isAlreadySent
    ? "This document already has an active signing request"
    : recipientCount === 0
      ? "Add recipients first"
      : !hasAssignedRecipientFields
        ? "Assign at least one field to a recipient before sending"
        : "Send document to recipients";


  return (
    <>
      {/* <Toaster /> */}
      <UnsavedChangesDialog
        isVisible={isUnsavedChangesDialogVisible}
        onCancel={() => setIsUnsavedChangesDialogVisible(false)}
        onSaveAndContinue={handleSaveAndContinue}
      />

    <div className="px-3 py-2 flex border-b">
      {/* Left main section */}
      <div className="flex flex-1 items-center gap-2">
           <div className="flex items-center bg-blue-50 rounded px-2 py-1 w-[260px] space-x-2 relative">
              <FileText  size={16} className="text-blue-600 flex-shrink-0" />

              {/* Rename  */}
              {isEditingFileName ? (
                <>
                <input
                  ref={inputRef}
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingFileName(false);
                  }}
                    className="truncate text-xs focus:outline-0 p-1 w-full"
                />
                <CheckLine
                  size={16}
                    className="cursor-pointer text-gray-600 hover:text-blue-600"
                    onClick={() => setIsEditingFileName(false)}
                  />
                </>
              ) : (
                <>
                  <span className="truncate text-xs w-full">{documentName}</span>
                  <PenLine
                  size={16}
                    className="cursor-pointer text-gray-600 hover:text-blue-600"
                    onClick={() => setIsEditingFileName(true)}
                  />
                </>
              )}
            </div>
          {/* ---info --*/}
          <Button className="text-xs !p-1 text-gray-700 !rounded-xl text-left relative dropdown" 
            type="button" aria-haspopup="true" aria-expanded="true"
            title="Info"
            inverted
          >
            <span>Info</span>
            <ChevronDown size={16}  />
              <div className="px-4 py-3 text-sm text-gray-900 space-y-1 w-[250px] mt-2  bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg outline-none absolute opacity-0 invisible dropdown-menu transition-all duration-300 transform z-20 top-6 left-0">
                  <div>
                    <small className="mb-4 text-gray-500"> Created on </small>
                    <p>{documentMetadata?.createdAt?.toLocaleString() || "Unknown"}</p>
                  </div>
                {documentMetadata?.lastModified && (
                  <div>
                  <small className="mb-4 text-gray-500">Last Modified:</small> 
                  <p>{documentMetadata.lastModified}</p>
                  </div>
                  )}
                  {documentMetadata?.author && (
                    <div>
                      <small className="mb-4 text-gray-500">Author:</small> 
                      <p>{documentMetadata.author}</p>
                    </div>
                  )}
                  {documentMetadata?.fileSize && (
                    <div>
                      <small className="text-gray-500">File size:</small>
                    <p>{documentMetadata.fileSize}</p>
                    </div>
                  )}                 
                <small className="text-gray-500">Documents</small>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FolderIcon size={18} /> Main</span>
                    <a href="#">Move</a>
                </div>
              </div>
   
          </Button>
          {lastSaved && (
            <small>
              Saved at {" "} {lastSaved.toLocaleTimeString()}
            </small>
          )} 
        </div>

        {/* Right Section */}
        <div className="flex flex-1 min-w-0 justify-end items-center gap-3 px-1">
           
              {/* Undo / Redo */}
            <div className="flex items-center gap-2">
              <Button 
                aria-label="Undo (Ctrl+Z)" 
                inverted
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                icon={ <Undo size={20} />}
                className="border-0 bg-transparent"
              />     
              <Button 
                aria-label="Redo (Ctrl+Y)" 
                inverted
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                icon={ <Redo size={20} />}
                className="border-0 bg-transparent"
              />
            </div>

            <Button
              icon={<Eye size={16} />}
              inverted
              title="Preview Document"
              className="relative group"
              onClick={onPreviewDocument}
            >
              <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                  Preview your document exactly as recipients see it. You can interact with fields, but signing is disabled.
                </div>
            </Button>
            <MoreActions menuItems={menuItems as []} />
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveStatus === 'saving'}
              title="Save your edits."
              icon={<Save size={18} />}
              label={
                  saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'saved'
                ? 'Saved ✓'
                : 'Save'
              }
            />
          <Button
            onClick={handleSendClick}
            disabled={isSendDisabled}
            title={sendTitle}
            label={`Send ${recipientCount}`}
            icon={<Send size={18}/>}
          />
          {isAlreadySent && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-amber-600">Already sent</div>
              <Button
                onClick={() => onVoidAndDerive?.()}
                title="Void the current request and start a new signing cycle"
                label="Void & Create New Revision"
              />
            </div>
          )}
          <Button icon={<LogOut size={16} />} inverted title="Exit from builder" onClick={()=> router.replace('/dashboard')} />
        </div>
   
    </div>
  
  </>
  );
};

export default ActionToolBar;

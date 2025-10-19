'use client';
import React, {useEffect, useRef, useState } from "react";
import { FileText, Settings, PenLine, CheckLine,
  Undo,
  Redo,
  Eye,
  Download,
  HelpCircle,
  LayoutGrid,
  ChevronLeft,
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
  Send
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
  hasUnsavedChanges: boolean;
  droppedItems: DroppedComponent[];
}

const menuItems = [
  { label: 'Download', icon: Download },
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
  hasUnsavedChanges,
  droppedItems = []
}) => {
  const { selectedFile } = useContextStore();
  const [isUnsavedChangesDialogVisible, setIsUnsavedChangesDialogVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);


  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const downloadDoc=async () => {
      if (!selectedFile) return;
      const pdfDoc = await loadPdf(selectedFile as File | string );
      const blob = await savePdfBlob(pdfDoc);
      downloadPdf(blob, documentName);
  }

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
          const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
          const opts: RequestInit = {};
          if (token) opts.headers = { Authorization: `Bearer ${token}` };
          console.log("Fetching metadata from:", selectedFile);
          const res = await fetch(selectedFile, opts);
          if (!res.ok) {
            throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
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
    const unassignedField = droppedItems.find(
      (item) => !item.assignedRecipientId || item.assignedRecipientId.trim() === ''
    );

    console.log("Validation: Dropped Items", droppedItems);
    if (unassignedField) {
      alert("All fields must be assigned to a signer before sending.");
      return;
    }

    onSendDocument();
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setSaveStatus('saving');
    try {
      const success = await handleSavePDF({ isServerSave: true });
      if (success) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        toast.success('Saved ✓');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      setSaveStatus('idle');
      toast.error('Error saving document. Please try again.');
      console.error(error);
    }
  };

  const handleSendClick = () => {
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

  const onBackClick = () => router.back();

  return (
    <>
      <Toaster />
      <UnsavedChangesDialog
        isVisible={isUnsavedChangesDialogVisible}
        onCancel={() => setIsUnsavedChangesDialogVisible(false)}
        onSaveAndContinue={handleSaveAndContinue}
      />

    <div className="h-16 bg-white border border-gray-300 px-3 py-3 flex items-center" data-redesign="true">
      <div className="flex flex-1 items-center">
        {/* Left main section */}
        <div className="flex flex-1 items-center min-w-0 px-1">
          <div className="flex items-center gap-4 min-w-0">
            {/* Back Button */}
            <Button
              aria-label="Press to go back"
              tabIndex={200}
              onClick={onBackClick}
              icon={  <ChevronLeft size={16} />}
              inverted={true}
           />
           <div
              className="flex items-center bg-blue-50 rounded px-2 py-1 w-[350px] justify-between space-x-2"
            >
              <FileText  size={18} className="text-blue-600 flex-shrink-0" />

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
                        className="truncate text-xs focus:outline-0 w-[80%] p-1"
                    />
                    <CheckLine
                      size={18}
                        className="cursor-pointer text-gray-600 hover:text-blue-600"
                        onClick={() => setIsEditingFileName(false)}
                      />
                    </>
                  ) : (
                    <>
                      <span className="truncate text-xs w-[80%] p-1">{documentName}</span>
                      <PenLine
                      size={18}
                        className="cursor-pointer text-gray-600 hover:text-blue-600"
                        onClick={() => setIsEditingFileName(true)}
                      />
                    </>
                  )}
            </div>
          </div>

          {/* ---info --*/}

          <div className="ml-2 relative dropdown">
                <button className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-gray-700 text-sm hover:bg-gray-100" 
                type="button" aria-haspopup="true" aria-expanded="true">
                  <span>Info</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              <div className="w-[300px] mt-2 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg outline-none absolute opacity-0 invisible dropdown-menu transition-all duration-300 transform -translate-y-2 scale-95 z-20">
                <div className="px-4 py-3 text-sm text-gray-900 space-y-1">
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
                 
                      <div>
                      <small className="text-gray-500">Documents</small>
                        <p className="flex items-center justify-between">
                          <span className="flex items-center gap-2"><FolderIcon size={18} /> Main</span>
                          <a href="#">Move</a>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="w-6 h-6 rounded-full bg-[#d5dce5] flex items-center justify-center text-xs">r</span>
                  rajesh.chaurasia@gmail.com
                </div>
              </div>
          </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-1 min-w-0 justify-end items-center space-x-4 px-1">
            {lastSaved && (
                <small>
                Saved at {lastSaved.toLocaleTimeString()}
                </small>
              )}
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
            disabled={recipients.length === 0 || hasUnsavedChanges}
            title={recipients.length === 0 ? "Add recipients first" : "Send document to recipients"}
            label={`Send ${recipients.length}`}
            icon={<Send size={18}/>}
          />
          <Button icon={<LogOut size={16} />} inverted title="Exit from builder" onClick={()=> router.replace('/dashboard')} />
        </div>
      </div>
    </div>
    {/***** Toolbar *****/}
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-b text-sm font-medium">
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
    <div className="w-px h-6 bg-gray-200 mx-2" />  
    {/* Spacer */}
    <div className="flex-grow" />

    {/* Right Actions */}
    <div className="flex items-center gap-3">
      <Button icon={<Eye size={16} />} label="Open Preview" inverted className="border-0 bg-gray-100 hover:bg-gray-200 text-gray-700"  />
      <div className="w-px h-6 bg-gray-200 mx-2" />
       <MoreActions  menuItems={[ 
          { label: "Download PDF", icon: Download, action:downloadDoc },
          { type: "divider", label: "" },
          { label: "Merge and download", icon: Merge, action: ()=> handleSavePDF({ isDownload: true, isMergeFields: true })},
          { type: "divider", label: "" },
          { label: "Merge Fields Into PDF", icon: Merge, action: ()=> handleSavePDF({ isMergeFields: true })},
         ]} triggerIcon={Download} />
             <div className="w-px h-6 bg-gray-200 mx-2" />
      <Button aria-label="Help" icon={<HelpCircle size={16} />} inverted className="border-0"/>
          <div className="w-px h-6 bg-gray-200 mx-2" />
      <Button aria-label="Settings" icon={<Settings size={16} />} inverted className="border-0"/>
          <div className="w-px h-6 bg-gray-200 mx-2" />
      <Button aria-label="Thumbnails" icon={<LayoutGrid size={16} />} inverted className="border-0"/>
    </div>
  </div>
  </>
  );
};

export default ActionToolBar;
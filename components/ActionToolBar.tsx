import React, { useEffect, useRef, useState } from "react";
import { FileText, Settings, PenLine, CheckLine,
  Undo,
  Redo,
  Text,
  CheckSquare,
  CalendarDays,
  Eye,
  Download,
  HelpCircle,
  LayoutGrid,
  ChevronLeft,
  ChevronDown,
  FolderIcon,
 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useRouter } from 'next/navigation';

import useContextStore from "@/hooks/useContextStore";
import MoreActions from "./MoreActionMenu";

interface ActionToolBarProps {
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  isEditingFileName: boolean;
  setIsEditingFileName: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: (isDownload?: boolean) => void;
}

  
  
const ActionToolBar: React.FC<ActionToolBarProps> = ({ 
  fileName,
  setFileName,
  isEditingFileName,
  setIsEditingFileName,
  handleSave
}) => {
  const { selectedFile } = useContextStore();

  const [documentMetadata, setDocumentMetadata] = useState<{
    createdAt?: Date;
    author?: string;
    fileSize?: string;
    lastModified?: string;
  } | null>(null);
  
  const router = useRouter();
  const onBackClick = () => {
    router.back();
  };
  const inputRef = useRef<HTMLInputElement>(null);

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
          const res = await fetch(selectedFile);
          arrayBuffer = await res.arrayBuffer();
        } else {
          arrayBuffer = await selectedFile.arrayBuffer();
          fileSize = selectedFile.size;
          lastModified = new Date(selectedFile.lastModified).toLocaleString();
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
        console.error("Failed to fetch metadata", err);
        setDocumentMetadata(null);
      }
    };
  
    fetchMetadata();
  }, [selectedFile]);



  return (
    <>
    <div className="h-16 bg-white border border-gray-300 px-3 py-3 flex items-center" data-redesign="true">
      <div className="flex flex-1 items-center">
        {/* Left main section */}
        <div className="flex flex-1 items-center min-w-0 px-1">
          <div className="flex items-center gap-4 min-w-0">
            {/* Back Button */}
            <button
              type="button"
              aria-label="Press to go back"
              tabIndex={200}
              className="iconButton border border-gray-300 text-md"
              onClick={onBackClick}
            >
              <ChevronLeft  className="w-4 h-4 text-gray-700" />
            </button>

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
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingFileName(false);
                      }}
                      data-testid="pdf-name"
                      className="truncate text-xs focus:outline-0 w-[80%] p-1 flex-shrink-0"
                    />
                    <CheckLine
                      size={18}
                        className="cursor-pointer text-gray-600 hover:text-blue-600"
                        onClick={() => setIsEditingFileName(false)} />
                    </>
                  ) : (
                    <>
                      <span className="truncate text-xs focus:outline-0 w-[80%] p-1">{fileName || 'Untitled Document'}</span>
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
                           <small className="mb-4 text-gray-500">File size:</small>
                          <p> {documentMetadata.fileSize}</p>
                          </div>
                        )}
                 
                      <div>
                      <small className="text-gray-500">Documents</small>
                        <p className="flex item-center justify-between">
                          <span className="flex item-center gap-2"><FolderIcon size={18}/> Main </span> 
                          <a href="#">Move</a>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="w-6 h-6 rounded-full bg-[#d5dce5] flex items-center justify-center text-xs">
                          r
                        </span>
                        rajesh.chaurasia@gmail.com
                      </div>
                </div>
              </div>
            
          </div> 

          {/* ---end of info --*/}
        </div>

        {/* Right actions */}
        <div className="flex flex-1 min-w-0 justify-end items-center space-x-4 px-1">
          {/* Settings Button */}
            <MoreActions  />
          {/* Save and Close Button */}
          <button
            type="button"
            className="bg-gray-100 text-gray-700 px-4 py-1 rounded hover:bg-gray-200"
            onClick={() => handleSave()}
          >
            Save and Close
          </button>

          {/* Continue Button */}
          <button
            type="button"
            className="bg-[#0777cf] text-white px-4 py-1 rounded hover:bg-[#025ea7]"
           
          >
            Continue
          </button>
        </div>
      </div>
    </div>
    {/***** Toolbar *****/}
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-b text-sm font-medium">
    {/* Undo / Redo */}
    <div className="flex items-center gap-2">
      <button aria-label="Undo" className="iconButton">
        <Undo size={20} />
      </button>
      <button aria-label="Redo" className="iconButton opacity-50" disabled>
        <Redo size={20} />
      </button>
    </div>

    <div className="w-px h-6 bg-gray-200 mx-2" />

    {/* Tool Buttons */}
    {/* <div className="flex items-center gap-2">
      <button aria-label="Text Tool" className="iconButton">
        <Text size={16} />
      </button>
      <button aria-label="Checkbox Tool" className="iconButton">
        <CheckSquare size={16} />
      </button>
      <button aria-label="Date Tool" className="iconButton">
        <CalendarDays size={16} />
      </button>
    </div> 

    <div className="w-px h-6 bg-gray-200 mx-2" />
*/}
    {/* Spacer */}
    <div className="flex-grow" />

    {/* Right Actions */}
    <div className="flex items-center gap-3">
      <button className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
        <Eye size={16} />
        <span>Open Preview</span>
      </button>
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <button className="iconButton" aria-label="Download" onClick={() => handleSave(true)}>
        <Download size={16} />
      </button>
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <button className="iconButton" aria-label="Help">
        <HelpCircle size={16} />
      </button>
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <button className="iconButton"  aria-label="Settings">
        <Settings size={20} />
      </button>
      <div className="w-px h-6 bg-gray-200 mx-2" />
      <button className="iconButton text-blue-600 bg-blue-50" aria-label="Thumbnails" >
        <LayoutGrid size={20} />
      </button>
    </div>
  </div>
  </>
  );
};

export default ActionToolBar;
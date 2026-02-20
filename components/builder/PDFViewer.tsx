'use client';
import { LoaderPinwheel } from 'lucide-react';
import React, { Fragment, useMemo } from 'react';
import { Document, Page, pdfjs } from "react-pdf";
import { initializePdfWorker } from '@/utils/pdfjsSetup';
import { Button } from '../Button';

// Initialize PDF worker once when component is imported
initializePdfWorker(pdfjs);

interface PDFViewerProps {
  selectedFile: File | string;
  pages: number[];
  zoom: number;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  generateThumbnails: (numPages: number) => void;
  insertBlankPageAt: (index: number) => void;
  toggleMenu: (e: React.MouseEvent, pageIndex?: number) => void;
  error?: string;
  signingToken?: string;
  isSigningMode?: boolean;
  isReadOnly?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  selectedFile,
  pages,
  zoom,
  pageRefs,
  generateThumbnails,
  insertBlankPageAt,
  toggleMenu,
  error,
  signingToken,
  isSigningMode,
  isReadOnly,
}) => {
const flexBoxcenter='absolute inset-0 flex items-center w-56 justify-center  text-center p-4 left-1/2 transform -translate-x-1/2'
  const isEditingDisabled = Boolean(isSigningMode || isReadOnly);
  
  const customHeaders = useMemo(() => {
    if (!isSigningMode) return {};

    const recipientId = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get("recipient") 
      : '';

    return {
      'X-Signing-Token': signingToken || '',
      'X-Recipient-Id': recipientId || '',
    };
  }, [isSigningMode, signingToken]);

  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    httpHeaders: customHeaders,
  }), [customHeaders]);

  return (
    <Document 
      file={selectedFile} 
      onLoadSuccess={(data) => generateThumbnails(data.numPages)}  
      options={pdfOptions}
      loading={<div className={`${flexBoxcenter}`}>
        <LoaderPinwheel className="animate-spin left-1/2 top-1/2 mr-2 " size="30" color='#2563eb' />
        Loading PDF...</div>} 
      error={<div className={`${flexBoxcenter} text-red-500`}>
            
                  {
                  error ? 
                        <>
                           Error: {error}
                          <p className="text-sm text-gray-600 mt-2">
                            Try uploading another PDF file
                          </p>
                          </>                
                        :
                      'Failed to load PDF'
                  }
          
             </div>
        }>
      {pages.map((pageNum) => (
        <Fragment key={pageNum}>
          <div className='flex justify-between w-full items-center p-2 page-brake'>
            <small className={`${isEditingDisabled && 'm-auto'}`}>{pageNum} of {pages.length}</small>
            {!isEditingDisabled && (
            <>
            <Button onClick={() => insertBlankPageAt(pageNum)} className='bg-transparent hover:text-white !p-0.5 rounded-sm text-[inherit]' label='+'/> 
            <div className='relative' onClick={(e) => toggleMenu(e, pageNum - 1)}>
              <Button className='bg-transparent hover:text-white !p-0.5 rounded-sm text-[inherit]' label="..."/> 
            </div>
            </>
            )}
          </div>
          <div
            data-page={pageNum}
            ref={(el: HTMLDivElement | null) => {
                pageRefs.current[pageNum - 1] = el;
                }}
            className="relative pdf-page"
          >
            <Page pageNumber={pageNum} width={890} scale={zoom} renderAnnotationLayer={false} renderTextLayer={false} />
          </div>
        </Fragment>
      ))}
    </Document>
  );
};

export default PDFViewer;

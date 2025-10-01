'use client';
import { LoaderPinwheel } from 'lucide-react';
import React, { Fragment } from 'react';
import { Document, Page } from "react-pdf";

interface PDFViewerProps {
  selectedFile: File | string;
  pages: number[];
  zoom: number;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  generateThumbnails: (numPages: number) => void;
  insertBlankPageAt: (index: number) => void;
  toggleMenu: (e: React.MouseEvent, pageIndex?: number) => void;
  error?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  selectedFile,
  pages,
  zoom,
  pageRefs,
  generateThumbnails,
  insertBlankPageAt,
  toggleMenu,
  error
}) => {
const flexBoxcenter='absolute inset-0 flex items-center w-56 justify-center  text-center p-4 left-1/2 transform -translate-x-1/2'
  return (
    <Document file={selectedFile} onLoadSuccess={(data) => generateThumbnails(data.numPages)}  
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
            <small>{pageNum} of {pages.length}</small>
            <button onClick={() => insertBlankPageAt(pageNum)} className='hover:bg-blue-500 hover:text-white p-0.5 rounded-sm'> + </button>
            <div className='relative' onClick={(e) => toggleMenu(e, pageNum - 1)}>
              <button className='hover:bg-blue-500 hover:text-white p-0.5 rounded-sm'> ... </button>
            </div>
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

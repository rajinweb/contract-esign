'use client';
import React, { Fragment } from 'react';
import { Document, Page } from "react-pdf";

interface PDFViewerProps {
  selectedFile: File | string;
  pages: number[];

  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  generateThumbnails: (numPages: number) => void;
  insertBlankPageAt: (index: number) => void;
  toggleMenu: (e: React.MouseEvent, pageIndex?: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  selectedFile,
  pages,
  pageRefs,
  generateThumbnails,
  insertBlankPageAt,
  toggleMenu
}) => {

  return (
    <Document file={selectedFile} onLoadSuccess={(data) => generateThumbnails(data.numPages)}>
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
            <Page pageNumber={pageNum} width={890} renderAnnotationLayer={false} renderTextLayer={false} />
          </div>
        </Fragment>
      ))}
    </Document>
  );
};

export default PDFViewer;

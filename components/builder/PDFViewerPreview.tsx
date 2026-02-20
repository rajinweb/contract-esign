'use client';

import React, { Fragment, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { LoaderPinwheel } from 'lucide-react';
import { initializePdfWorker } from '@/utils/pdfjsSetup';

// Initialize PDF worker once when component is imported
initializePdfWorker(pdfjs);

export interface PDFViewerPreviewProps {
  file: string | File;
  onLoadSuccess?: (data: { numPages: number }) => void;
  loading?: React.ReactNode;
  error?: React.ReactNode;
  pages?: number[];
  renderPages?: boolean;
  customHeaders?: Record<string, string>;
  scale?: number;
}

const flexBoxCenter = 'absolute inset-0 flex items-center w-56 justify-center text-center p-4 left-1/2 transform -translate-x-1/2';
const DEFAULT_HEADERS: Record<string, string> = {};

const PDFViewerPreview: React.FC<PDFViewerPreviewProps> = ({
  file,
  onLoadSuccess,
  loading,
  error,
  pages = [],
  renderPages = true,
  customHeaders = DEFAULT_HEADERS,
  scale = 1,
}) => {
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      httpHeaders: customHeaders,
    }),
    [customHeaders]
  );

  const defaultLoading = (
    <div className={flexBoxCenter}>
      <LoaderPinwheel className="animate-spin mr-2" size="30" color="#2563eb" />
      Loading PDF...
    </div>
  );

  const defaultError = (
    <div className={`${flexBoxCenter} text-red-500`}>
      {error || 'Failed to load PDF'}
    </div>
  );

  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      options={pdfOptions}
      loading={loading || defaultLoading}
      error={defaultError}
    >
      {renderPages &&
        pages.length > 0 &&
        pages.map((pageNum) => (
          <Fragment key={pageNum}>
            <div className="relative pdf-page">
              <Page
                pageNumber={pageNum}
                width={890}
                scale={scale}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </div>
          </Fragment>
        ))}
    </Document>
  );
};

export default PDFViewerPreview;

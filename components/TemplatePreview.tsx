'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PDFViewerPreviewProps } from './builder/PDFViewerPreview';

const PDFViewerPreview = dynamic<PDFViewerPreviewProps>(
  () => import('./builder/PDFViewerPreview'),
  { ssr: false }
);

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

export interface TemplatePreviewProps {
  templateUrl: string;
  templateName: string;
  onClose?: () => void;
}

function TemplatePreview({ templateUrl }: TemplatePreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(0.8);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const pages = Array.from({ length: numPages }, (_, i) => i + 1).filter(
    (page) => page === currentPage
  );

  return (
    <>
      <div className='[&_canvas]:m-auto min-h-32'>
        <PDFViewerPreview
          file={templateUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          pages={pages}
          renderPages={true}
          scale={scale}
        />
      </div>
      {/* Controls */}
      <div className="border rounded-full border-gray-200 p-3 flex items-center justify-between gap-4 bg-gray-50 sticky bottom-0 left-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage === numPages}
            className="p-2 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition"
          >
            −
          </button>
          <span className="text-sm text-gray-600 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(2, scale + 0.1))}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition"
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}

export default TemplatePreview;

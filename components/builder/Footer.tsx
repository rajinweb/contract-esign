'use client';
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ZoomControls from './ZoomControls';

interface FooterProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  setZoom: (zoom: number) => void;
  onPageChange: (page: number) => void;
}

const Footer: React.FC<FooterProps> = ({ currentPage, totalPages, zoom, setZoom, onPageChange }) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800/70 text-white p-2 rounded-md text-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronLeft size={20} />
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="w-px h-6 bg-gray-600" />
      <ZoomControls zoom={zoom} setZoom={setZoom} />
    </div>
  );
};

export default Footer;
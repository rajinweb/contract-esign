'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  setZoom: (zoom: number) => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, setZoom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const zoomLevels = [0.5, 1, 1.5, 2, 2.5, 3];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="p-1 hover:bg-gray-700 rounded-full">
          <ZoomOut size={16} />
        </button>
        <div className="w-px h-5 bg-gray-600" />
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1">
          <span>{Math.round(zoom * 100)}%</span>
          <ChevronDown size={16} />
        </button>
        <div className="w-px h-5 bg-gray-600" />
        <button onClick={() => setZoom(zoom + 0.1)} className="p-1 hover:bg-gray-700 rounded-full">
          <ZoomIn size={16} />
        </button>
      </div>
      {isOpen && (
        <div className="absolute bottom-full mb-2 w-40 bg-white border rounded-md shadow-lg text-black">
          <ul>
            <li
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
              onClick={() => handleZoomChange(1)} // Fit to width can be handled here
            >
              <span>Fit to Width</span>
              {zoom === 1 && <span className="text-blue-500">✓</span>}
            </li>
            {zoomLevels.map(level => (
              <li
                key={level}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                onClick={() => handleZoomChange(level)}
              >
                <span>{level * 100}%</span>
                {zoom === level && <span className="text-blue-500">✓</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ZoomControls;

'use client';
import React, { Fragment, RefObject, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { Plus, Ellipsis, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '../Button';

interface PageThumbnailsProps {
  selectedFile: string | File;
  pages: number[];
  currentPage: number;
  thumbRefs: RefObject<(HTMLDivElement | null)[]>;
  handleThumbnailClick: (pageNum: number) => void;
  insertBlankPageAt: (pageNum: number) => void;
  toggleMenu: (event: React.MouseEvent, pageIndex?: number) => void;
  isSigningMode:boolean
}

const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  selectedFile,
  pages,
  currentPage,
  thumbRefs,
  handleThumbnailClick,
  insertBlankPageAt,
  toggleMenu,
  isSigningMode
}) => {
  const [toggleThumbPanel, setToggleThumbPanel] = React.useState(false);
  const toggleCollapsExpand = () => setToggleThumbPanel(prev => !prev);
  return (
    <aside className={`${toggleThumbPanel ? 'absolute w-12 right-2' : 'w-40 bg-white relative overflow-auto'}`}>
      <div className={`p-2 py-2 ${toggleThumbPanel ? '' : 'bg-gray-50 flex items-center gap-2 border-b   text-xs font-semibold sticky top-0 z-50'}`}>
        <Button 
          icon={toggleThumbPanel ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          inverted
          onClick={toggleCollapsExpand}
          className="!p-0 !h-7 !w-7"/>
          {!toggleThumbPanel? 'Thumbnails' : ''}
       </div>
      <Document file={selectedFile} className={`w-26 p-4 ${toggleThumbPanel ? 'hidden' : ''}`}>
        {pages.map((pageNum) => (
          <Fragment key={pageNum}>
            <div
              className="relative group"
              ref={(el) => {
                if (thumbRefs.current) {
                  thumbRefs.current[pageNum - 1] = el;
                }
              }}
            >
              <Page
                pageNumber={pageNum}
                width={100}
                loading={"Page Loading..."}
                className={`flex justify-center p-2 border cursor-pointer page-badge ${
                  currentPage == pageNum ? 'active-page' : ''
                }`}
                onClick={() => {
                  handleThumbnailClick(pageNum);
                }}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
              {!isSigningMode &&
              <div className="absolute right-2 top-2">
                <div
                  className="relative"
                  onClick={(e) => toggleMenu(e, pageNum - 1)}
                >
                  <button
                    className={`${
                      currentPage == pageNum ? 'block' : 'hidden'
                    }  group-hover:block bg-gray-300 hover:bg-blue-500  hover:text-white p-0.5 rounded-sm`}
                  >
                    <Ellipsis size={20} />
                  </button>
                </div>
              </div>
              }
            </div>

            <small className="flex justify-center group relative h-10 cursor-pointer">
             {!isSigningMode &&  <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 p-1 rounded group-hover:bg-blue-500 group-hover:text-white"
                onClick={() => insertBlankPageAt(pageNum)}
              >
                <Plus
                  size={16}
                  strokeWidth={3}
                  className="w-4 h-4 text-center"
                />
              </span>
              }
              <hr className="border-gray-300 w-full group-hover:border-blue-500 absolute top-1/2  z-9" />
            </small>
          </Fragment>
        ))}
      </Document>
    </aside>
  );
};

export default PageThumbnails;

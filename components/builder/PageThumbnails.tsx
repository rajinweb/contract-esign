'use client';
import React, { Fragment, RefObject } from 'react';
import { Document, Page } from 'react-pdf';
import { Plus, Ellipsis } from 'lucide-react';

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
  return (
    <aside className="w-40 overflow-auto bg-white p-5">
      <Document file={selectedFile} className="w-26">
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

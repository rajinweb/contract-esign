"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { PDFDocument } from 'pdf-lib';
import { blobToURL, loadPdf } from '@/lib/pdf';
import { Doc } from '@/types/types';

interface UsePdfStateArgs {
  selectedFile: File | string | Doc | null;
  setSelectedFile: (value: File | string | Doc | null) => void;
  onPageChange?: (page: number) => void;
  onNumPagesChange?: (numPages: number) => void;
}

export const usePdfState = ({
  selectedFile,
  setSelectedFile,
  onPageChange,
  onNumPagesChange,
}: UsePdfStateArgs) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [menuTriggerElement, setMenuTriggerElement] = useState<HTMLElement | null>(null);

  const documentRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);

  const resolvePdfSource = useCallback((value: File | string | Doc | null): File | string | null => {
    if (!value) return null;
    if (typeof value === 'string' || value instanceof File) return value;
    if (typeof value === 'object') {
      const fileCandidate = (value as Doc).file;
      if (typeof fileCandidate === 'string' || fileCandidate instanceof File) {
        return fileCandidate;
      }
      if (typeof (value as Doc).fileUrl === 'string') {
        return (value as Doc).fileUrl as string;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const loadPdfForEditing = async () => {
      const source = resolvePdfSource(selectedFile);
      if (source) {
        try {
          const loaded = await loadPdf(source);
          setPdfDoc(loaded);
        } catch (err) {
          console.error("Error loading PDF for menu operations:", err);
        }
      } else {
        setPdfDoc(null);
      }
    };
    loadPdfForEditing();
  }, [selectedFile, resolvePdfSource]);

  const generateThumbnails = useCallback((numPages: number) => {
    setPages(Array.from({ length: numPages }, (_, i) => i + 1));
  }, []);

  const handleThumbnailClick = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
    const page = pageRefs.current[pageNum - 1];
    page?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }, []);

  const handlePdfUpdated = useCallback(async (updatedDoc: PDFDocument) => {
    try {
      const bytes = await updatedDoc.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = await blobToURL(blob);

      setSelectedFile(url);
      setPdfDoc(updatedDoc);
      generateThumbnails(updatedDoc.getPageCount());
    } catch (err) {
      console.error("handlePdfUpdated failed:", err);
    }
  }, [setSelectedFile, generateThumbnails]);

  const insertBlankPageAt = useCallback(async (index: number, onAfterUpdate?: () => void) => {
    if (!pdfDoc) return;
    pdfDoc.insertPage(index);
    await handlePdfUpdated(pdfDoc);
    onAfterUpdate?.();
  }, [pdfDoc, handlePdfUpdated]);

  const toggleMenu = useCallback((event: MouseEvent, pageIndex?: number) => {
    setMenuTriggerElement(event.currentTarget as HTMLElement);
    if (typeof pageIndex === 'number') {
      setSelectedPageIndex(pageIndex);
    }
    setShowMenu(true);
  }, []);

  // Auto-highlighted thumbnails when scrolling
  useEffect(() => {
    if (!pages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const pageNum = parseInt(
            visible.target.getAttribute('data-page') || '0',
            10
          );
          if (pageNum) {
            setCurrentPage(pageNum);
          }
        }
      },
      { root: null, threshold: [0.25, 0.5, 0.75] }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    if (typeof onPageChange === 'function') {
      onPageChange(currentPage);
    }
    if (typeof onNumPagesChange === 'function') {
      onNumPagesChange(pages.length);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const activeThumb = thumbRefs.current[currentPage - 1];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage]);

  return {
    pdfDoc,
    setPdfDoc,
    pages,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    showMenu,
    setShowMenu,
    selectedPageIndex,
    setSelectedPageIndex,
    menuTriggerElement,
    setMenuTriggerElement,
    documentRef,
    pageRefs,
    thumbRefs,
    generateThumbnails,
    handleThumbnailClick,
    handlePdfUpdated,
    insertBlankPageAt,
    toggleMenu,
  };
};

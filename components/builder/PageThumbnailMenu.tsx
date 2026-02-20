import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, ArrowUp, ArrowDown, Copy, Trash2, FileSymlink, Replace } from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";

interface Props {
  onClose: () => void;
  triggerElement?: HTMLElement | null;
  pdfDoc: PDFDocument;
  pageIndex: number;
  onPdfUpdated: (updatedDoc: PDFDocument) => void;
}

const PageThumbnailMenu: React.FC<Props> = ({
  onClose,
  triggerElement,
  pdfDoc,
  pageIndex,
  onPdfUpdated,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const menuStyle = useMemo<React.CSSProperties>(() => {
    if (!triggerElement) return {};
    const rect = triggerElement.getBoundingClientRect();
    return {
      position: "fixed",
      top: `${rect.bottom}px`,
      left: `${rect.right - 192}px`, // w-48 is 12rem = 192px
    };
  }, [triggerElement]);

  // Close menu on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", onClose, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  // --- Page operations ---
  const rotatePage = async () => {
    const page = pdfDoc.getPage(pageIndex);
    const rotation = page.getRotation().angle;
    page.setRotation(degrees((rotation + 90) % 360));
    onPdfUpdated(pdfDoc); // ✅ Let parent handle save + reload
    onClose();
  };

  const duplicatePage = async () => {
    const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
    pdfDoc.insertPage(pageIndex + 1, copiedPage);
    await onPdfUpdated(pdfDoc);
    onClose();
  };

  const removePage = async () => {
    pdfDoc.removePage(pageIndex);
    await onPdfUpdated(pdfDoc);
    onClose();
  };

  const movePageUp = async () => {
    if (pageIndex <= 0) return;
    const [page] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
    pdfDoc.removePage(pageIndex);
    pdfDoc.insertPage(pageIndex - 1, page);
    await onPdfUpdated(pdfDoc);
    onClose();
  };

  const movePageDown = async () => {
    if (pageIndex >= pdfDoc.getPageCount() - 1) return;
    const [page] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
    pdfDoc.removePage(pageIndex);
    pdfDoc.insertPage(pageIndex + 1, page);
    await onPdfUpdated(pdfDoc);
    onClose();
  };

  const listItemCss =
    "flex items-center gap-2 hover:bg-gray-100 p-2 cursor-pointer";

  const menu = (
    <div
      ref={ref}
      className="z-50 bg-white shadow-md border rounded w-48" style={menuStyle}
    >
      <ul className="text-sm p-2">
        <li className={listItemCss} onClick={rotatePage}>
          <RotateCcw size={16} /> Rotate Page
        </li>
        <li className={listItemCss} onClick={movePageUp}>
          <ArrowUp size={16} /> Move Page Up
        </li>
        <li className={listItemCss} onClick={movePageDown}>
          <ArrowDown size={16} /> Move Page Down
        </li>
        <li className={listItemCss}>
          <FileSymlink size={16} /> Move Page To...
        </li>
        <li className={listItemCss}>
          <Replace size={16} /> Replace Page
        </li>
        <li className={listItemCss} onClick={duplicatePage}>
          <Copy size={16} /> Duplicate Page
        </li>
        <li className={`${listItemCss} text-red-600`} onClick={removePage}>
          <Trash2 size={16} /> Remove Page
        </li>
      </ul>
    </div>
  );

  return createPortal(menu, document.body);
};

export default PageThumbnailMenu;

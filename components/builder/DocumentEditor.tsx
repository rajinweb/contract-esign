"use client";
import React, { useEffect, useState, useRef, MouseEvent, ChangeEvent} from 'react';
import { saveFileToIndexedDB, getFileFromIndexedDB, clearFileFromIndexedDB} from '@/utils/indexDB';
// Third-party
import { pdfjs } from "react-pdf";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { DraggableData } from 'react-rnd';
import dayjs from "dayjs";
import { LoaderPinwheel } from 'lucide-react';

// Project utils & types
import { blobToURL } from "@/utils/Utils";
import { DroppingField, DroppedComponent } from '@/types/types';

// Components
import UploadZone from "@/components/UploadZone";
import Fields from '@/components/builder/Fields';
import useContextStore from '@/hooks/useContextStore';
import { AddSigDialog } from "@/components/builder/AddSigDialog";
import { RealtimePhotoDialog } from "@/components/builder/RealtimePhotoDialog";
import Modal from '../Modal';
import ActionToolBar from '@/components/builder/ActionToolBar';
import PageThumbnailMenu from '@/components/builder/PageThumbnailMenu';
import PageThumbnails from './PageThumbnails';
import PDFViewer from './PDFViewer';
import DroppedComponents from './DroppedComponents';
import Footer from './Footer';

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const DocumentEditor: React.FC = () => {
  // ========= Context =========
  const { selectedFile, setSelectedFile, isLoggedIn, showModal, setShowModal } = useContextStore();

  // ========= PDF State =========
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  // ========= Page Menu =========
  const [showMenu, setShowMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [menuTriggerElement, setMenuTriggerElement] = useState<HTMLElement | null>(null);

  // ========= Drag & Drop =========
  const [isDragging, setIsDragging] = useState(false);
  const [draggingComponent, setDraggingComponent] = useState<DroppingField | null>(null);
  const [droppedComponents, setDroppedComponents] = useState<DroppedComponent[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementId, setElementId] = useState(0);

  // ========= UI State =========
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<boolean>(false);
  const [photoDialog, setPhotoDialog] = useState<boolean>(false);
  const [selectedFieldForDialog, setSelectedFieldForDialog] = useState<DroppedComponent | null>(null);
  const [autoDate, setAutoDate] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>('');
  const [isEditingFileName, setIsEditingFileName] = useState<boolean>(false);

  // ========= Refs =========
  const documentRef = useRef<HTMLDivElement | null>(null);
  const draggingEle = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textFieldRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  // ==========================================================
  // PDF & Page Handling
  // ==========================================================
  const generateThumbnails = (numPages: number) => {
    setPages(Array.from({ length: numPages }, (_, i) => i + 1));
  };

  const handleThumbnailClick = (pageNum: number) => {
    setCurrentPage(pageNum);
    const page = documentRef.current?.querySelector(`[data-page-number="${pageNum}"]`);
    page?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  };

  const insertBlankPageAt = async (index: number) => {
    if (!selectedFile) return;
    const arrayBuffer = typeof selectedFile === 'string'
      ? await fetch(selectedFile).then(res => res.arrayBuffer())
      : await selectedFile.arrayBuffer();

    const pdfDocLocal = await PDFDocument.load(arrayBuffer);
    pdfDocLocal.insertPage(index, [595.28, 841.89]); // A4 size

    await handlePdfUpdated(pdfDocLocal);
    setDroppedComponents([]);
  };

  const handlePdfUpdated = async (updatedDoc: PDFDocument) => {
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
  };

  // ==========================================================
  // Drag & Drop
  // ==========================================================
  const handleDragStart = () => {
    document.body.classList.add('dragging-no-select');
  };

  const mouseDownOnField = (component: string, e: MouseEvent<HTMLDivElement>) => {
    const xy = { x: e.clientX, y: e.clientY };
    setDraggingComponent({ ...draggingComponent, component, ...xy });
    setPosition(xy);
    handleDragStart();
  };

  const mouseMoveOnDropArea = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingComponent && draggingEle.current) {
      draggingEle.current.style.display = 'block';
      setPosition({ x: e.clientX - 65, y: e.clientY });
    }
  };

  const clickOnDropArea = (e: MouseEvent<HTMLDivElement>) => {
    if (!draggingComponent || e.target instanceof HTMLElement && e.target.closest('.react-draggable') || e.target instanceof HTMLElement && e.target?.closest('.page-brake')) return;

    const rect = documentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newComponent: DroppedComponent = {
      id: elementId,
      component: draggingComponent.component,
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
      width: 100,
      height: 50,
    };

    setDroppedComponents((prev) => [...prev, newComponent]);
    setElementId((id) => id + 1);
  };

  const deleteField = (e: MouseEvent, item: DroppedComponent) => {
    e.stopPropagation();
    setDroppedComponents((prev) => prev.filter((c) => c.id !== item.id));
  };

  const handleDragStop = (e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => {
    document.body.classList.remove('dragging-no-select');
    if ((e.target as HTMLElement).closest('.delete-button-wrapper')) {
      return;
    }

    if (data.x === item.x && data.y === item.y) {
      clickField(e as MouseEvent, item);
      return;
    }

    e.stopPropagation();
    if (!documentRef.current) return;

  const parentRect = documentRef.current.getBoundingClientRect();
  const scrollY = window.scrollY;

  const fieldTopAbs = data.y + parentRect.top + scrollY;
  const fieldBottomAbs = fieldTopAbs + item.height;

  let newY = data.y;
  let newPageNumber = item.pageNumber;

  // Check each page
  for (let i = 0; i < pageRefs.current.length; i++) {
    const pageEl = pageRefs.current[i];
    if (!pageEl) continue;

    const rect = pageEl.getBoundingClientRect();
    const pageTopAbs = rect.top + scrollY;
    const pageBottomAbs = pageTopAbs + rect.height;

    if (fieldTopAbs >= pageTopAbs && fieldBottomAbs <= pageBottomAbs) {
      // Fully inside this page -> no snapping
      newY = data.y;
      newPageNumber = i + 1;
      break;
    }

    if (fieldBottomAbs > pageTopAbs && fieldTopAbs < pageBottomAbs) {
      // Intersecting page break -> snap to nearest edge
      const distToTop = Math.abs(fieldTopAbs - pageTopAbs);
      const distToBottom = Math.abs(fieldBottomAbs - pageBottomAbs);

      if (distToTop < distToBottom) {
        newY = pageTopAbs - parentRect.top + 1; // snap to top
      } else {
        newY = pageBottomAbs - item.height - parentRect.top - 1; // snap to bottom
      }
      newPageNumber = i + 1;
      break;
    }
  }

  // Update state
  setDroppedComponents(prev =>
    prev.map(c =>
      c.id === item.id
        ? { ...c, x: data.x, y: newY, pageNumber: newPageNumber }
        : c
    )
  );
};

  const handleResizeStop = (e: MouseEvent | TouchEvent, item: DroppedComponent, ref: { style: { width: string; height: string } }, pos: { x: number, y: number }, delta: { width: number, height: number }) => {
    document.body.classList.remove('dragging-no-select');
    e.stopPropagation();
    setDroppedComponents((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : c
      )
    );
  };

  // ==========================================================
  // Effects
  // ==========================================================
  useEffect(() => {
    // Restore file on reload
    (async () => {
      const file = await getFileFromIndexedDB();
      if (file) {
        setSelectedFile(file as File);
      }
    })();
  //@typescript-eslint/ban-ts-comment
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    saveFileToIndexedDB(selectedFile);
    setLoading(false);
    setError(null);
    setCurrentPage(1);

    if (selectedFile instanceof File) setFileName(selectedFile.name);
    else setFileName(decodeURIComponent((selectedFile as string).split('/').pop()?.split('?')[0] || ''));

  }, [selectedFile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedFile) return setPdfDoc(null);

      try {
        setLoading(true);
        const buffer = typeof selectedFile === 'string'
          ? await fetch(selectedFile).then(res => res.arrayBuffer())
          : await selectedFile.arrayBuffer();

        const loadedDoc = await PDFDocument.load(buffer);
        if (!mounted) return;
        setPdfDoc(loadedDoc);
        generateThumbnails(loadedDoc.getPageCount());
      } catch {
        setError("Failed to load PDF");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [selectedFile]);

  //File Handling
 const handleSave = async (isDownload: boolean = false) => {
    if (!isLoggedIn) {
      setShowModal(true);
      return;
    }

    const canvas = documentRef.current;
    const canvasRect = canvas?.getBoundingClientRect(); // Get the canvas bounds

    if (!canvasRect) {
      console.error("Canvas not found!");
      return; // Exit if there's no valid canvas
    }

    // Fetch and load the selected PDF
    if (!selectedFile) {
      console.error("No file selected!");
      return;
    }

    const arrayBuffer = typeof selectedFile === 'string'
      ? await fetch(selectedFile).then(res => res.arrayBuffer())
      : await selectedFile.arrayBuffer();

    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Get the specified page (pageNum)
    const pages = pdfDoc.getPages();
    const page = pages[currentPage - 1];

    // Check if the page is rotated
    const isPageRotated = page.getRotation().angle;

    const pageWidth = page.getSize().width;
    const pageHeight = page.getSize().height;

    for (const item of droppedComponents) {
      const { x, y, component, width, height, data, pageNumber } = item;

      // Find the corresponding page element in DOM (must exist)
      const pageIndex = (pageNumber ?? currentPage) - 1;
      const pageEl = pageRefs.current[pageIndex];
      if (!pageEl) {
        console.warn('Page element not found for item, skipping', item);
        continue;
      }

      const pageRect = pageEl.getBoundingClientRect();

      // Calculate scale using the actual page element dimensions (DOM -> PDF)
      const scaleX = pageWidth / pageRect.width;
      const scaleY = pageHeight / pageRect.height;

      // Compute coordinates of the item RELATIVE TO the page element.
      // droppedComponents.x/y are relative to documentRef (canvas). Convert to page-local.
      const relativeX = x - (pageRect.left - canvasRect.left);
      const relativeY = y - (pageRect.top - canvasRect.top);

      // Convert to PDF coordinates (PDF origin bottom-left)
      const adjustedX = relativeX * scaleX;
      const adjustedY = pageHeight - (relativeY + height) * scaleY;

      // Boundary checks (use scaled sizes for comparisons)
      const scaledW = width * scaleX;
      const scaledH = height * scaleY;

      let finalX = adjustedX;
      let finalY = adjustedY;

      if (finalX < 0) finalX = 0;
      if (finalX + scaledW > pageWidth) finalX = pageWidth - scaledW;

      if (finalY < 0) finalY = 0;
      if (finalY + scaledH > pageHeight) finalY = pageHeight - scaledH;

    if (data) {
      // Draw the component (Text, Date, or Image)
      if (component === "Text" || component === "Date") {

        // PDFDocument load ke baad
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const lineHeight = fontSize * 1.2;
        const maxWidth = width * scaleX; // textarea width scaled to PDF
        const textLines: string[] = []; // lines to draw


        data.split('\n').forEach((paragraph) => {
          let line = '';
          paragraph.split(' ').forEach((word) => {
            const testLine = line ? line + ' ' + word : word;
            const lineWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
            if (lineWidth > maxWidth) {
              textLines.push(line);
              line = word;
            } else {
              line = testLine;
            }
          });
          if (line) textLines.push(line);
        });

        // Draw lines within rectangle
        let cursorY = adjustedY + height * scaleY - lineHeight;
        textLines.forEach((line) => {
          if (cursorY < adjustedY) return; // clip if overflows
          page.drawText(line, { x: adjustedX, y: cursorY, size: fontSize, font: helveticaFont });
          cursorY -= lineHeight;
        });
      } else if (component === "Signature" || component === "Image" || component === "Realtime Photo") {
         try {
            const imgUrl = data as string;
            if (!imgUrl) continue;

            const res = await fetch(imgUrl);
            const imgBytes = await res.arrayBuffer();

            // Check actual file signature (magic numbers)
            const bytes = new Uint8Array(imgBytes);
            let embeddedImage;

            if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
              // PNG
              embeddedImage = await pdfDoc.embedPng(imgBytes);
            } else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
              // JPEG
              embeddedImage = await pdfDoc.embedJpg(imgBytes);
            } else {
              console.warn("Unsupported image format (not PNG/JPEG). Skipped.");
              continue;
            }

            page.drawImage(embeddedImage, {
              x: finalX,
              y: finalY,
              width: scaledW,
              height: scaledH,
              ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {}),
            });
          } catch (err) {
            console.error("Failed to embed image:", err);
            continue;
          }
      }
    }
      // Add a timestamp if autoDate is true
      if (autoDate) {
        page.drawText(`Signed ${dayjs().format("M/d/YYYY HH:mm:ss ZZ")}`,
          {
            x: finalX,
            y: finalY - 20 * Math.min(scaleX, scaleY),
            size: 10,
            color: rgb(0.074, 0.545, 0.262),
            ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {})
          }
        );
      }
    }

    // Save the modified PDF to bytes and convert to a Blob
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

    // Convert the Blob into a URL for downloading / preview
    const pdfUrl = await blobToURL(blob);

    if (isDownload) {
      // Sanitize and apply file name
      const safeFileName = fileName.replace(/[<>:"/\\|?*]+/g, '').trim();
      const finalFileName = safeFileName.endsWith('.pdf') ? safeFileName : `${safeFileName}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      }
      setSelectedFile(pdfUrl);
      /* Clean up filed after merge into pdf*/
      setPosition({ x: 0, y: 0 });
      setDroppedComponents([]);
  };
  // Drag & Drop Helpers
  const mouseLeaveOnDropArea = () => {
    document.body.classList.remove('dragging-no-select');
    if (draggingEle.current) {
      draggingEle.current.style.display = 'none';
    }
  };

  const clickField = (event: MouseEvent, item: DroppedComponent) => {
    event.stopPropagation(); // prevent parent clicks (like drop area)

    if (isDragging) {
      setIsDragging(false);
      return; // ignore click while dragging
    }

    // Set the currently selected component
    setDraggingComponent(item);

    // Handle component-specific actions
    switch (item.component) {
      case "Signature":
         setSelectedFieldForDialog(item);
        setDialog(true); // open signature modal
        break;
      case "Image":
        setSelectedFieldForDialog(item);
        imageRef.current?.click(); // trigger file input
        break;
      case "Text":
      case "Date":
        setSelectedFieldForDialog(item);
        break;
      case "Realtime Photo":
        setSelectedFieldForDialog(item);
        setPhotoDialog(true);
        break;
      default:
        console.warn("Unknown component clicked:", item.component);
    }
  };

const updateField = (data: string | null, id: number) => {
  setDroppedComponents(prev =>
    prev.map(c => (c.id === id ? { ...c, data } : c))
  );
};

const onUploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = await blobToURL(file);

  // Update the DroppedComponent that is currently being dragged
  if (draggingComponent && 'id' in draggingComponent) {
    setDroppedComponents(prev =>
      prev.map(comp =>
        comp.id === draggingComponent.id
          ? { ...comp, data: url }
          : comp
      )
    );
  }

  e.target.value = '';
};

 const toggleMenu = (event: React.MouseEvent, pageIndex?: number) => {
  setMenuTriggerElement(event.currentTarget as HTMLElement);
  if (typeof pageIndex === 'number') {
    setSelectedPageIndex(pageIndex);
  }
  setShowMenu(true);
};
  //auto-highlighted thumbnails when scrolling
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

    return () => observer.disconnect();
  }, [pages]);

  // 🔥 Auto-scroll active thumbnail into view
  useEffect(() => {
    const activeThumb = thumbRefs.current[currentPage - 1];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage]);
  // ==========================================================
  // Render
  // ==========================================================
  const containerHeight = pageRefs.current.reduce((acc, page) => {
    if (!page) return acc;
    const rect = page.getBoundingClientRect();
    return acc + rect.height + 40; // 40 for margin/padding between pages
  }, 0);
  return (
    <>
      {!isLoggedIn && <Modal visible={showModal} onClose={() => setShowModal(false)} />}
      <ActionToolBar
        fileName={fileName}
        setFileName={setFileName}
        isEditingFileName={isEditingFileName}
        setIsEditingFileName={setIsEditingFileName}
        handleSave={handleSave}
      />
      <div className='bg-[#efefef] flex h-[calc(100vh-107px)]'>
        <Fields
          activeComponent={draggingComponent?.component ?? null}
          mouseDown={mouseDownOnField}
          selectedFile={selectedFile as File}
          handleReset={() => {
            setSelectedFile(null);
            setDroppedComponents([]);
            clearFileFromIndexedDB();
          }}
        />
        {!selectedFile && (<UploadZone />)}
        {selectedFile && (
          <>
            {draggingComponent && (
              <div
                className="bg-[#f4faff] border border-1 border-blue-300 px-2 text-center text-[12px] fixed min-w-[100px] z-[999999] left-[7px] top-[38px]"
                style={{
                  transform: `translate(${position.x + 50}px, ${position.y + 2}px)`,
                }}
                ref={draggingEle}
              >
                {draggingComponent.component}
              </div>
            )}
            <input type="file" ref={imageRef} id="image" className="hidden"  accept="image/png, image/jpeg, image/jpg" onChange={onUploadImage}  />
            {loading && (<LoaderPinwheel className="absolute z-10 animate-spin left-1/2 top-1/2 " size="40" color='#2563eb' />)}
            <div className={`flex relative my-1 overflow-auto flex-1 justify-center ${draggingComponent && 'cursor-fieldpicked'}`} id="dropzone" >

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="text-red-500 text-center p-4">
                    <p className="font-medium">{error}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Try uploading another PDF file
                    </p>
                  </div>
                </div>
              )}
            <div style={{ minHeight: `${containerHeight}px`, transform: `scale(${zoom})`, transformOrigin: 'top left' }}  onClick={clickOnDropArea}
              onMouseMove={mouseMoveOnDropArea}
              onMouseLeave={mouseLeaveOnDropArea}
              ref={documentRef}
               >
                 <DroppedComponents
                    droppedComponents={droppedComponents}
                    setDroppedComponents={setDroppedComponents}
                    deleteField={deleteField}
                    updateField={updateField}
                    handleDragStop={handleDragStop}
                    handleResizeStop={handleResizeStop}
                    textFieldRefs={textFieldRefs}
                    zoom={zoom}
                  />
              <PDFViewer selectedFile={selectedFile} pages={pages} zoom={1} pageRefs={pageRefs} generateThumbnails={(data) => generateThumbnails(data)} insertBlankPageAt={insertBlankPageAt} toggleMenu={toggleMenu}/>
            </div>
            </div>
            {/* Aside Panel for Page Thumbnails */}
            <PageThumbnails
              selectedFile={selectedFile}
              pages={pages}
              currentPage={currentPage}
              thumbRefs={thumbRefs}
              handleThumbnailClick={handleThumbnailClick}
              insertBlankPageAt={insertBlankPageAt}
              toggleMenu={toggleMenu}
            />
          </>
        )}
        {dialog && (
          <AddSigDialog
            autoDate={autoDate}
            setAutoDate={setAutoDate}
            onClose={() => setDialog(false)}
            onConfirm={(data: string | null) => {
             if (selectedFieldForDialog) updateField(data, selectedFieldForDialog.id);
             setDialog(false);
            }}
          />
        )}
        {photoDialog && (
          <RealtimePhotoDialog
            onClose={() => setPhotoDialog(false)}
            onConfirm={(data: string) => {
              if (selectedFieldForDialog) updateField(data, selectedFieldForDialog.id);
              setPhotoDialog(false);
            }}
          />
        )}
      </div>
      {selectedFile && (
        <Footer
          currentPage={currentPage}
          totalPages={pages.length}
          zoom={zoom}
          setZoom={setZoom}
          onPageChange={handleThumbnailClick}
        />
      )}

      {/* -- PageThumbnailMenu integration (uses pdfDoc, pageIndex and onPdfUpdated) */}
     {pdfDoc && showMenu && selectedPageIndex !== null && (
      <PageThumbnailMenu
        onClose={() => setShowMenu(false)}
        triggerElement={menuTriggerElement}
        pdfDoc={pdfDoc}
        pageIndex={selectedPageIndex}
        onPdfUpdated={handlePdfUpdated}
      />
      )}
    </>
  );
};

export default DocumentEditor;

"use client";
import React, {
  useEffect,
  useState,
  useRef,
  MouseEvent,
  ChangeEvent,
} from 'react';
import { saveFileToIndexedDB, getFileFromIndexedDB, clearFileFromIndexedDB} from '@/utils/indexDB';
// Third-party
import { pdfjs } from "react-pdf";
import { PDFDocument, rgb, degrees } from "pdf-lib";
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
import Modal from '../Modal';
import ActionToolBar from '@/components/builder/ActionToolBar';
import PageThumbnailMenu from '@/components/builder/PageThumbnailMenu';
import PageThumbnails from './PageThumbnails';
import PDFViewer from './PDFViewer';
import DroppedComponents from './DroppedComponents';

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const DocumentEditor: React.FC = () => {
  // ========= Context =========
  const { selectedFile, setSelectedFile, isLoggedIn, showModal, setShowModal } = useContextStore();

  // ========= PDF State =========
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

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
  const mouseDownOnField = (component: string, e: MouseEvent<HTMLDivElement>) => {
    const xy = { x: e.clientX, y: e.clientY };
    setDraggingComponent({ ...draggingComponent, component, ...xy });
    setPosition(xy);
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
      x: e.clientX - rect.left - 50,
      y: e.clientY - rect.top,
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

  const handleDragStop = (item: DroppedComponent, data: DraggableData) => {
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

  const handleResizeStop = (item: DroppedComponent, ref: { style: { width: string; height: string } }, pos: { x: number, y: number }) => {
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
      const { x, y, component, width, height, data } = item;

      const scaleX = pageWidth / canvasRect.width;
      const scaleY = pageHeight / canvasRect.height;

      // Calculate adjusted positions
      let adjustedX = x * scaleX;
      let adjustedY = pageHeight - (y + height);


      // Boundary checks
      if (adjustedX < 0) adjustedX = 0;
      if (adjustedX + width * scaleX > pageWidth) adjustedX = pageWidth - width * scaleX;

      if (adjustedY < 0) adjustedY = 0;
      if (adjustedY + height * scaleY > pageHeight) adjustedY = pageHeight - height * scaleY;

    if(data){
      // Draw the component (Text, Date, or Image)
      if (component === "Text" || component === "Date") {
        page.drawText(data as string, {
          x: adjustedX,
          y: adjustedY,
          size: 12,
          ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {})
        });
      } else if (component === "Signature" || component === "Image") {
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
              console.warn("⚠️ Unsupported image format (not PNG/JPEG). Skipped.");
              continue;
            }

            page.drawImage(embeddedImage, {
              x: adjustedX,
              y: adjustedY,
              width: width * scaleX,
              height: height,
              ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {}),
            });
          } catch (err) {
            console.error("❌ Failed to embed image:", err);
            continue;
          }
      }
    }
      // Add a timestamp if autoDate is true
      if (autoDate) {
        page.drawText(`Signed ${dayjs().format("M/d/YYYY HH:mm:ss ZZ")}`,
          {
            x: adjustedX,
            y: adjustedY - 20 * Math.min(scaleX, scaleY),
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

    // Convert the Blob into a URL for downloading
    const pdfUrl = await blobToURL(blob);

    if(isDownload){
      // Sanitize and apply file name
      const safeFileName = fileName.replace(/[<>:"/\|?*]+/g, '').trim();
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
  };
  // Drag & Drop Helpers
  const mouseLeaveOnDropArea = () => {
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
  const pdfHeight = 890;
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
            <input type="file" ref={imageRef} id="image" className="hidden"  accept="image/png, image/jpeg, image/jpg"onChange={onUploadImage}  />
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
            <div style={{ minHeight: `${pages.length * (pdfHeight+40)}px` }}  onClick={clickOnDropArea}
              onMouseMove={mouseMoveOnDropArea}
              onMouseLeave={mouseLeaveOnDropArea}
              ref={documentRef}
               >
                 <DroppedComponents 
                    droppedComponents={droppedComponents}
                    setDroppedComponents={setDroppedComponents}
                    clickField={clickField}
                    deleteField={deleteField}
                    updateField={updateField}
                    handleDragStop={handleDragStop}
                    handleResizeStop={handleResizeStop}
                    onUploadImage={onUploadImage}
                  />
              <PDFViewer selectedFile={selectedFile} pages={pages} pageRefs={pageRefs} generateThumbnails={(data) => generateThumbnails(data)} insertBlankPageAt={insertBlankPageAt} toggleMenu={toggleMenu}/>
            
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
      </div>

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

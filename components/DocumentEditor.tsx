'use client';
import React, { useEffect, useState, useRef, MouseEvent, Fragment, SetStateAction, ChangeEvent, useCallback } from 'react';
import UploadZone from "@/components/UploadZone";
import { CircleX, Ellipsis, LoaderPinwheel, Plus } from 'lucide-react';
import { Rnd } from 'react-rnd';
import Fields from '@/components/Fields';
import useContextStore from '@/hooks/useContextStore';

import { blobToURL } from "@/utils/Utils"
import {DroppingField, DroppedComponent} from '@/types/types'

import { Document, Page, pdfjs } from "react-pdf";
// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


import { degrees, PDFDocument, rgb } from "pdf-lib";
import dayjs from "dayjs";


import { AddSigDialog } from "@/components/AddSigDialog";
import ImageField from './ImageField';
import { DraggableData } from 'react-draggable';
import MultilineTextField from './MultilineTextField';
import Modal from './Modal';
import DateField from './DateField';

import ActionToolBar from '@/components/ActionToolBar';
import PageThumbnailMenu from '@/components/PageThumbnailMenu';

const DocumentEditor: React.FC = () => {
  const { selectedFile, setSelectedFile, isLoggedIn, showModal, setShowModal } = useContextStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggingComponent, setDraggingComponent] = useState<DroppingField | null>(null);
  const [droppedComponents, setDroppedComponents] = useState<DroppedComponent[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number }>({x: 0, y: 0 });
  const [elementId, setElementId] = useState(0);

  const corners = { width: 10, height: 10 };
  const draggingEle = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const documentRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [dialog, setDialog] = useState<boolean>(false);   
  const [autoDate, setAutoDate] = useState<boolean>(true);

  const [fileName, setFileName] = useState<string>('');
  const [isEditingFileName, setIsEditingFileName] = useState<boolean>(false);
  
  const [menuTriggerElement, setMenuTriggerElement] = useState<HTMLElement | null>(null);
  const toggleMenu = (event: React.MouseEvent) => {
    setMenuTriggerElement(event.currentTarget as HTMLElement);
  };

  // Function to generate page thumbnails
  const generateThumbnails = (numPages: number) => {
    const thumbnails = [];
    for (let i = 1; i <= numPages; i++) {
      thumbnails.push(i); // Store page numbers for thumbnails
    }
    setPages(thumbnails);
  };

  const handleThumbnailClick = (pageNum:number) => {
    setCurrentPage(pageNum);
    if (documentRef.current) {
      const page = documentRef.current.querySelector(`[data-page-number="${pageNum}"]`);
      if (page) {     
        page.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }
    }
  };

  const insertBlankPageAt = async (index: number) => {
    if (!selectedFile) return;
    const arrayBuffer = typeof selectedFile === 'string'
      ? await fetch(selectedFile).then(res => res.arrayBuffer())
      : await selectedFile.arrayBuffer();

    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const [width, height] = [595.28, 841.89]; // A4 size
    pdfDoc.insertPage(index, [width, height]);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const newURL = await blobToURL(blob);

    setSelectedFile(newURL);
    setDroppedComponents([]);
  };


   // Check which page is visible and update the currentPage
  const checkVisiblePage = useCallback(() => {
      const container = documentRef.current?.parentElement;
      if (container) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        
        // Check which page is currently in view
        pages.forEach((page, index) => {
          const pageDOM=container.querySelector(`[data-page-number="${page}"]`) as HTMLElement;
        if(pageDOM){
          const pageTop = pageDOM.offsetTop;
          const pageBottom = pageTop + pageDOM.clientHeight;

          // If page is within the container's scrollable area, it's visible
          if (pageTop <= containerBottom && pageBottom >= containerTop) {
            setCurrentPage(index + 1); // Set current page based on visibility
          }
        }
        });
      }
    },[pages]);

  const mouseDownOnField = (
    component: string,
    event: React.MouseEvent<HTMLDivElement>
    ) => {
      const xy={  x: event.clientX, y: event.clientY}
      setDraggingComponent({ ...draggingComponent, component, ...xy });
      setPosition(xy);
    };

  const mouseMoveOnDropArea = (event: React.MouseEvent<HTMLDivElement>) => {
     if (
      draggingEle.current &&
      (event.target as HTMLElement).classList.contains('react-draggable')
    ) {
      draggingEle.current.style.display = 'none';
    } else {
      if (draggingComponent && draggingEle.current) {
        draggingEle.current.style.display = 'block';
        setPosition({
          x: event.clientX -65,
          y: event.clientY,
        });
      }
    }
  };

  const mouseLeaveOnDropArea = () => {
    if (draggingComponent && draggingEle.current) {
      draggingEle.current.style.display = 'none';
    }
  };

const textFieldRef = useRef<HTMLInputElement>(null);

const imageRef = useRef<HTMLInputElement>(null);
const builderContainer=useRef<HTMLDivElement>(null);
const onUploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file && selectedFile) {
    const url = await blobToURL(file) as string;
    updateField(url)
  }
  // Reset the file input value
  e.target.value = '';
};

const updateField=(data: React.SetStateAction<string | null>)=> {
  console.log('updateField'); 
  const updates = droppedComponents.map(component => 
    component.id === (draggingComponent as DroppedComponent)?.id ? { ...component, data } : component
    )
  setDroppedComponents(updates);   
}
const dropFields = (field:DroppedComponent) => {
    const fieldtName=field.component;
    if(fieldtName=='Signature'){
      setDialog(true);
    }
    if(fieldtName=='Image'){
      imageRef.current?.click();   
    }
  }
  // Handle placing the component in the panel
  const clickOnDropArea = (event: React.MouseEvent<HTMLDivElement>) => {
    const targetElem=event.target as HTMLElement;
    if(!targetElem.closest('.react-draggable')){
      if (draggingComponent && documentRef.current) {

        const panelRect = documentRef.current.getBoundingClientRect();
        const offsetX = event.clientX - panelRect.left;
        const offsetY = event.clientY - panelRect.top;

        // Place at current mouse position within the panel
        const newComponent: DroppedComponent = {
          id: elementId,
          component: draggingComponent.component,
          x: offsetX - 50,
          y: offsetY,
          width: 100,
          height: 50,
        };

        setDroppedComponents((prev) => [...prev, newComponent]);
        setElementId(prev => prev + 1);

      }

    }

  };

  const deleteField = (event: MouseEvent, item: DroppedComponent) => {

    event.stopPropagation();
    const updatedComponents = droppedComponents.filter(
      (component) => component.id !== item.id
    );
  
    setDroppedComponents(updatedComponents);
  };

  const clickField=(event: MouseEvent,item: DroppedComponent) => {
    if(isDragging){
      setIsDragging(false);
    }else{
      // console.log('Component clicked operation goes here', event, item);
      dropFields(item)
      setDraggingComponent(item);
    }
  } 

  useEffect(() => {
    if (selectedFile) {
     setLoading(false);
      setError(null);
      setCurrentPage(1); 

       // Extract file name if it's a File object
      if (selectedFile instanceof File) {
        setFileName(selectedFile.name);
      } else if (typeof selectedFile === 'string') {
        const urlParts = (selectedFile as string).split('/');
        const lastPart = urlParts[urlParts.length - 1].split('?')[0];
        setFileName(decodeURIComponent(lastPart));
      }
      if(builderContainer.current){
      builderContainer.current.style.height=`${window.innerHeight-115}px`
      }
    }  
  }, [selectedFile, builderContainer]);

  useEffect(() => {    
    const container = documentRef.current;
    if (container && container.parentElement) {      
        container.parentElement.addEventListener('scroll', checkVisiblePage);
    }
    return () => {
      if (container  && container.parentElement) {
        container.parentElement.removeEventListener('scroll', checkVisiblePage);
      }
    };
  }, [pages, checkVisiblePage]);

  const handleDragStop = (item: DroppedComponent, data: DraggableData) => {
    const updatedComponents = droppedComponents.map((component) =>
      component.id === item.id ? { ...component, x: data.x, y: data.y } : component
    );
    setDroppedComponents(updatedComponents);
    
  };

  const handleResizeStop = (item: DroppedComponent, ref: { style: { width: string; height: string; }; }, position: {x:number, y:number}) => {
    const updatedComponents = droppedComponents.map((component) =>
      component.id === item.id
        ? {
            ...component,
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
            ...position,
          }
        : component
    );

    setDroppedComponents(updatedComponents);
  }

  const commonclass = 'after:m-auto flex after:bg-blue-500';

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
    const pageHeight =    page.getSize().height;

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
      } else {
        // Load and embed PNG image
        const pngImage = await pdfDoc.embedPng(data as string);
        page.drawImage(pngImage, {
          x: adjustedX,
          y: adjustedY,
          width: width * scaleX,
          height: height ,
          ...(isPageRotated ? { rotate: degrees(isPageRotated) } : {})
        });
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
      setPosition({ x: 0, y: 0 });
      setDroppedComponents([]);
  };

  return (
    <>
    {!isLoggedIn && <Modal visible={showModal} onClose={() => setShowModal(false)}  /> }
      
      
      <ActionToolBar
        fileName={fileName}
        setFileName={setFileName}
        isEditingFileName={isEditingFileName}
        setIsEditingFileName={setIsEditingFileName}
        handleSave={handleSave}     
      />
    

      <div className='bg-[#efefef] flex' ref={builderContainer}>
        <Fields
          activeComponent={draggingComponent?.component ?? null}
          mouseDown={mouseDownOnField}
          selectedFile={selectedFile}
          handleReset={() => {
            setSelectedFile(null);
            setDroppedComponents([]);
          }}
        />
      {!selectedFile && ( <UploadZone /> )}
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
      <input type="file" ref={imageRef} id="image" className="hidden" onChange={onUploadImage} />
          { loading && (<LoaderPinwheel className="absolute z-10 animate-spin left-1/2 top-1/2 " size="40" color='#2563eb' /> )}
          <div
            className={`flex relative my-1 overflow-auto flex-1 justify-center ${draggingComponent && 'cursor-fieldpicked' }`}
            ref={documentRef}
            onClick={clickOnDropArea}
            onMouseMove={mouseMoveOnDropArea}
            onMouseLeave={mouseLeaveOnDropArea}
            id="dropzone"
            >
      
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
    
            {droppedComponents.map((item, index) => {
         
              return (
                <Rnd
                  key={index}
                  bounds={'parent'}
                  className="group absolute cursor-pointer bg-[#1ca4ff33] min-w-[100px] min-h-[50px] z-50 text-center"
                  position={{ x: item.x, y: item.y }}
                  size={{ width: item.width, height: item.height }}
                  onDrag={()=>setIsDragging(true)}
                  onDragStop={(e, data) => handleDragStop(item, data)}
                  onClick={(e:MouseEvent)=>clickField(e, item)}
                  onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(item, ref, position)}
                  resizeHandleStyles={{
                    topLeft: { ...corners, left: -5, top: -5 },
                    topRight: { ...corners, right: -5, top: -5 },
                    bottomLeft: { ...corners, left: -5, bottom: -5 },
                    bottomRight: { ...corners, right: -5, bottom: -5 },
                  }}
                  resizeHandleClasses={{
                    bottomLeft: 'border-b-2 border-l-2 border-gray-900',
                    bottomRight: 'border-b-2 border-r-2 border-gray-900',
                    topLeft: 'border-t-2 border-l-2 border-gray-900',
                    topRight: 'border-t-2 border-r-2 border-gray-900',
                    top: `${commonclass} after:h-[1px] after:w-1/2 after:mt-0`,
                    right: `${commonclass} after:h-1/2 after:w-[1px] after:mr-0`,
                    bottom: `${commonclass} after:h-[1px] after:w-1/2 after:mb-0`,
                    left: `${commonclass} after:h-1/2 after:w-[1px] after:ml-0`,
                  }}
                  resizeHandleWrapperClass="hidden group-hover:block"
                >
                  <CircleX
                    className="absolute left-1/2 -top-6 transform -translate-x-1/2 cursor-pointer"
                    size={18}
                    color="red"
                    onClick={(e) => deleteField(e, item)}
                  />
                  {item.data && 
                    (item.component=="Signature" || item.component === 'Image') ? <ImageField image={item.data} /> :
                    item.component=="Text" ? <MultilineTextField textInput={updateField} ref={textFieldRef as unknown as React.RefObject<HTMLTextAreaElement>} /> :
                    item.component=="Date" ? <DateField textInput={updateField} defaultDate={item.data} ref={textFieldRef} /> : item.component.toLowerCase()
                    
                  }
                </Rnd>
            );
          })}
          
          <Document file={selectedFile} onLoadSuccess={(data) => generateThumbnails(data.numPages)} className="">
              {pages.map((pageNum, index) => (
              <Fragment key={index}>
                  <div className='flex justify-between w-full items-center p-2'>
                      <small>{pageNum} of {pages.length}</small>
                      <button onClick={() => insertBlankPageAt(pageNum)} className='hover:bg-blue-500 hover:text-white p-0.5 rounded-sm'> <Plus size={16} /> </button>
                      <div className='relative' onClick={toggleMenu}>
                        <button  className='hover:bg-blue-500 hover:text-white p-0.5 rounded-sm'> <Ellipsis size={16} /> </button>
                      </div>
                    </div> 
                <Page pageNumber={pageNum} width={890}  loading={"Page Loading..."} renderAnnotationLayer={false} renderTextLayer={false}/>
              </Fragment>
            ))}
          </Document>
          </div>

          {/* Aside Panel for Page Thumbnails */}
          <aside className='w-64 overflow-auto bg-white p-5'>
            <Document file={selectedFile} className="w-26" >
              {pages.map((pageNum) => (

                <Fragment key={pageNum}>   

                  <div className='relative group'>                       
                    <Page pageNumber={pageNum} width={100} loading={"Page Loading..."} 
                    className={`flex justify-center p-2 border cursor-pointer page-badge ${currentPage == pageNum ? 'active-page' : ''}`}  
                    onClick={() => { handleThumbnailClick(pageNum)}} renderAnnotationLayer={false} renderTextLayer={false}/>   
                    <div className='absolute right-2 top-2'>
                      <div className='relative' onClick={toggleMenu}>
                        <button className={`hidden group-hover:block  bg-gray-300 hover:bg-blue-500  hover:text-white p-0.5 rounded-sm`}> 
                            <Ellipsis size={20} /> 
                        </button>
                      </div>
                    </div>
                  </div>    

                  <small className='flex justify-center group relative h-10 cursor-pointer'>
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 p-1 rounded group-hover:bg-blue-500 group-hover:text-white" onClick={() => insertBlankPageAt(pageNum)}>
                      <Plus size={16} strokeWidth={3} className="w-4 h-4 text-center" />
                    </span>
                    <hr className="border-gray-300 w-full group-hover:border-blue-500 absolute top-1/2  z-9"/>
                  </small>

                </Fragment>
                
                ))}
            </Document>
           </aside>
       </>    
       )}
        {dialog  && (
            <AddSigDialog
              autoDate={autoDate}
              setAutoDate={setAutoDate}
              onClose={() => setDialog(false)}
              onConfirm={(data: SetStateAction<string | null>) => { 
                updateField(data)           
                setDialog(false);
              }}
            />
          )}
      </div>
     
       {menuTriggerElement &&
        <PageThumbnailMenu
          triggerElement={menuTriggerElement}
          onClose={() => setMenuTriggerElement(null)}
        />
        }
    </>
  );
};

export default DocumentEditor;


/*
 
  
    useEffect(() => {
      if (fields.component && fields.value) {
        updatePDFWithPosition(fields.value);
      }
      return 
    }, [fields]);

    const updatePDFWithPosition = async (
    imageURL: string | File,
    ): Promise<string> => {

    if (!pageDetails || !position) return ""; 
    if (!documentRef.current) return "";

        const { originalHeight, originalWidth } = pageDetails;
        const scale = documentRef.current ? originalWidth / documentRef.current.clientWidth : 1;
    
        // Calculate new X and Y positions relative to the document size   
        const y = documentRef.current.clientHeight - (position.y + documentRef.current.offsetTop);
        const x = position.x - documentRef.current.offsetLeft;
    
        const newY = (y * originalHeight) / documentRef.current.clientHeight;
        const newX = (x * originalWidth) / documentRef.current.clientWidth;
    
        // Fetch and load the selected PDF
        const arrayBuffer = typeof selectedFile === 'string' 
          ? await fetch(selectedFile).then(res => res.arrayBuffer()) 
          : await selectedFile!.arrayBuffer();
    
        const pdfDoc = await PDFDocument.load(arrayBuffer);
    
        // Get the specified page (pageNum)
        const pages = pdfDoc.getPages();
        const page = pages[pageNum];
    
        // Check if the page is rotated
        const IsPageRotated = page.getRotation().angle;
        console.log("Page rotation: ", IsPageRotated);

        const adjustedY = originalHeight - newY;
        const adjustedX = originalWidth - newX;

        // Draw the signature on the page at the new position
        if (fields.component =="Text" || fields.component=="Date") {
          page.drawText(fields.value as unknown as string, {
            x: IsPageRotated ? adjustedX-10 : newX+10,
            y: IsPageRotated ? adjustedY+30 : newY-25,
            size: IsPageRotated ? 20 * -scale : 20 * scale, 
          });
        } else {
          // Load and embed PNG image
          const pngImage = await pdfDoc.embedPng(imageURL as unknown as string);
          const pngDims = pngImage.scale(IsPageRotated ? -scale * 0.3 : scale * 0.3)
          page.drawImage(pngImage, {
            x: IsPageRotated ? adjustedX-10 : newX+10,
            y: IsPageRotated ? adjustedY+30 : newY-25,
            width: pngDims.width,
            height: pngDims.height,
          });
        }
        // Add a timestamp if autoDate is true
        if (autoDate) {
          page.drawText(
            `Signed ${dayjs().format("M/d/YYYY HH:mm:ss ZZ")}`,
            {
              x: IsPageRotated ? adjustedX+40 : newX,
              y: (IsPageRotated ? adjustedY+40 : newY-35) , 
              size: IsPageRotated ? 14 * -scale : 14 * scale, 
              color: rgb(0.074, 0.545, 0.262),
            }
          );
        }
    
        // Save the modified PDF to bytes and convert to a Blob
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    
        // Convert the Blob into a URL for downloading
        const pdfUrl = await blobToURL(blob);
        
        dispatch({type: 'Reset', payload:'' })

        setSelectedFile(pdfUrl);
        setPosition(null); 
        return pdfUrl;
    };

*/
'use client';
import React, { useEffect, useState, useRef, MouseEvent, Fragment, SetStateAction, ChangeEvent, useCallback } from 'react';
import UploadZone from "@/components/UploadZone";
import { CircleX, LoaderPinwheel } from 'lucide-react';
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
import LoginModal from './LoginModal';
import DateField from './DateField';

declare const isUserLoggedIn: () => boolean; // Assume this function exists

const DocumentEditor: React.FC = () => {
  const { selectedFile, setSelectedFile } = useContextStore();
  
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

  const [showModal, setShowModal] = useState(false); // State to control modal visibility


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
      (documentRef.current.parentElement as HTMLDivElement).scrollTop = (page as HTMLElement).offsetTop;   
      }
    }
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

  const mouseMoveOnDropArea = (event: MouseEvent) => {
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
  const clickOnDropArea = (event: MouseEvent) => {
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
        setElementId(elementId + 1);

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
    }     
  }, [selectedFile]);

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

  const handleSave = async () => {
    if (!isUserLoggedIn?.()) {
      showLoginModal();
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

    setSelectedFile(pdfUrl);
    setPosition({ x: 0, y: 0 });
    setDroppedComponents([]);
  };

  // Placeholder function for sending the file
  const handleSend = async () => {
    if (!isUserLoggedIn?.()) {
      showLoginModal();
      return;
    }
    // Original send logic goes here
    console.log("Sending file...");
    // You would typically perform an API call or other action to send the file
    // For demonstration, I'm just logging a message.
  };

  // Function to show the login modal
  const showLoginModal = () => {
    setShowModal(true);
  };
      
  // Function to show the login modal
  // Function to hide the login modal
  const hideLoginModal = () => {
    setShowModal(false);
  };

  return (
    <div className="flex space-x-4">
      <Fields
        activeComponent={draggingComponent?.component ?? null}
        mouseDown={mouseDownOnField}
        selectedFile={selectedFile}
        handleReset={() => {
          setSelectedFile(null);
          setDroppedComponents([]);
        }}
      handleSave={handleSave}
      handleSend={handleSend} // Pass the send handler to Fields
      />
      {!selectedFile && (
      <UploadZone
        onFileSelect={async (file: File) => {
          const URL = await blobToURL(file);
          setSelectedFile(URL);
        }}
      />
      )}
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
      <div className='max-h-screen overflow-auto relative'>
          { loading && (<LoaderPinwheel className="absolute z-10 animate-spin left-1/2 top-1/2 " size="40" color='#2563eb' /> )}
          <div
            className={`flex relative ${draggingComponent && 'cursor-fieldpicked' }`}
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
          
          <Document file={selectedFile} onLoadSuccess={(data) => generateThumbnails(data.numPages)}>
              {pages.map((pageNum, index) => (
              <Fragment key={index}>
                <Page pageNumber={pageNum} width={800} height={1200} loading={"Page Loading..."}/>
              <small className='flex justify-center p-2'>Page {pageNum} of {pages.length}</small>
              </Fragment>
            ))}
          </Document>
          </div>
       </div>
          {/* Aside Panel for Page Thumbnails */}
          <aside className='max-h-screen overflow-auto'>
            <Document file={selectedFile} className="w-26" >
              {pages.map((pageNum) => (
                  <Fragment key={pageNum} >                          
                  <Page pageNumber={pageNum} width={100} loading={"Page Loading..."} className={`flex justify-center bg-white p-2 border cursor-pointer ${currentPage == pageNum ? ' border-blue-500' : 'border-gray-300'}`}  onClick={() => {
                
                handleThumbnailClick(pageNum)
              }} />
                  <small className='flex justify-center p-2'>Page {pageNum}</small>
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

      <LoginModal
        visible={showModal}
        onClose={hideLoginModal}
        onLogin={(username, password) => console.log('Login attempt:', username, password)} // Replace with actual login logic
      />

    </div>
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
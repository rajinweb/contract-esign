'use client';
import { ChangeEvent, DragEvent, SetStateAction, useEffect, useReducer, useRef, useState } from "react";
import UploadZone from "@/components/UploadZone";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import { blobToURL } from "@/utils/Utils";
import PagingControl from "@/components/PagingControl";
import { AddSigDialog } from "@/components/AddSigDialog";
import DragableField from "./Draggable";
import { Button } from "@/components/Button";
import ImageField from "@/components/ImageField"; 
import dayjs from "dayjs";
import useContextStore from '@/hooks/useContextStore';
import Fields from "./Fields";
import { Position, PageDetails } from "@/types/types";

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


import MultilineTextField from "./MultilineTextField";

// Utility function to trigger file download
function downloadURI(uri: string | File, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = typeof uri === 'string' ? uri : URL.createObjectURL(uri);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface State {
    component: string;
    value:any
  }

type Action = { 
    payload: any; 
    type: string | null  
  }

const initialState: State = { 
    component: '', 
    value:'' 
  };

function tasksReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'Image':
    case 'Signature':
    case 'Text':
    case 'Date':
      return { component: action.type, value: action.payload };
    case 'Reset':
      return initialState;
    default:
      return state;
  }
}


export default function DocumentEditor() {

  const [autoDate, setAutoDate] = useState<boolean>(true);
  const [position, setPosition] = useState<Position | null>(null);

  const [dialog, setDialog] = useState<boolean>(false);
  const [pageNum, setPageNum] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageDetails, setPageDetails] = useState<PageDetails | null>(null);
  
  const documentRef = useRef<HTMLDivElement | null>(null);
  const { selectedFile, setSelectedFile } = useContextStore();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [fileName, setFileName] = useState<string | null>(selectedFile?.name || 'null');

  const [fields, dispatch] = useReducer(tasksReducer, initialState);
  
  const textFieldRef = useRef<HTMLInputElement>(null);
const [dragContainerHeight, setDragContainerHeight]= useState()
  useEffect(() => {
    if (selectedFile) {
      setLoading(false);
      setError(null);
    } 
  }, [selectedFile]);

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
  

  const onUploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    
    const file = e.target.files?.[0];
    if (file && selectedFile) {
      const url = await blobToURL(file) as string;
      const img = new Image();
      img.src = url;
      img.onload = () => {       
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          dispatch({ type: 'Image', payload: pngUrl });
        }
      };
    }
    // Reset the file input value
    e.target.value = '';
  };
  
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const imageRef = useRef<HTMLInputElement>(null);

  const dropFields = (label: string) => {
    if(label=='Signature'){
      setDialog(true);
    }
    if(label=='Image'){
      imageRef.current?.click();   
    }
    if(label=='Text' || label=='Date'){
      dispatch({type: label=='Text' ? 'Text' : 'Date', payload:'' })
    }
  }
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    const field = JSON.parse(e.dataTransfer.getData('fieldType')); 
    console.log('drop', field);
    dropFields(field.label)
    setIsDraggingOver(false)
  }
  console.log('dragContainerHeight', dragContainerHeight)

  return (
    <div className="flex h-full">
      <Fields handleSave={() => {}} handleClick={(label: string) => dropFields(label)}/>
      <div className="flex-1 relative overflow-auto bg-gray-100 p-4">
        <div className="relative inline-block">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          )}

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

          {dialog  && (
            <AddSigDialog
              autoDate={autoDate}
              setAutoDate={setAutoDate}
              onClose={() => setDialog(false)}
              onConfirm={(url: SetStateAction<string | null>) => {   
                dispatch({ type: 'Signature', payload: url }); 
                setDialog(false);
              }}
            />
          )}

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
                        
              <input type="file" ref={imageRef} id="image" className="hidden" onChange={onUploadImage} />
             
              <Button
                title={"Reset"}
                onClick={() => {
                  dispatch({type: 'Reset', payload:'' })
                  setSelectedFile(null);
                  setTotalPages(0);
                  setPageNum(0);
                  setPageDetails(null);
                  setPosition(null);
                }}
              />
              <Button
                title={"Download"}
                onClick={() => downloadURI(selectedFile, fileName || 'download.pdf')}
              />

              <div ref={documentRef} className="max-w-4xl mx-auto mt-2 border border-gray-300" 
                onDrop={e => handleDrop(e)}
                onDragOver={e => handleDragOver(e)}
                >
                  
                {(fields.component=='Date' ||  fields.component =='Text') && (
                  <DragableField 
                  onEnd={(position: Position) => { setPosition(position);}} 
                  onCancel={() => dispatch({type: 'Reset', payload:''})}
                  onSet={() => dispatch({ type: fields.component, payload: textFieldRef.current?.value })}
                  
                  >
                    <MultilineTextField
                      initialText={'Hello'}
                      ref={textFieldRef as unknown as React.RefObject<HTMLTextAreaElement>}
                       />
                  </DragableField>
                )}

                {/* Show  image and Signature */}
                {((fields.component=='Signature') || (fields.component=='Image' && fields.value)) && (
                   <DragableField 
                    onEnd={(position: Position) => setPosition(position)}  
                    onCancel={() => dispatch({type: 'Reset', payload:''})}
                    onSet={() => dispatch({ type: fields.component, payload: fields.value})}
                  >
                    <ImageField image={fields.value}/>
                  </DragableField>
                )}

               

                {selectedFile && (
                  <Document
                    file={selectedFile ? selectedFile : undefined}
                    onLoadSuccess={(data) => {
                      setTotalPages(data.numPages);
                    }}
                  >
                    <Page
                      pageNumber={pageNum + 1}
                      width={800}
                      height={1200}
                      onLoadSuccess={(data) => {
                        setPageDetails(data);
                      }}
                    />
                  </Document>
                )}

                <PagingControl
                  pageNum={pageNum}
                  setPageNum={setPageNum}
                  totalPages={totalPages}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

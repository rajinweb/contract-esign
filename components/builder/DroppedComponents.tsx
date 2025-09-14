// components/builder/DroppedComponents.tsx
'use client';
import React, { useState, useRef, MouseEvent, ChangeEvent } from 'react';
import { Rnd } from 'react-rnd';
import { DroppedComponent } from '@/types/types';
import MultilineTextField from './MultilineTextField';
import DateField from './DateField';
import ImageField from './ImageField';
import { CircleX } from 'lucide-react';
import { blobToURL } from '@/utils/Utils';

interface DroppedComponentsProps {
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  documentRef: React.RefObject<HTMLDivElement>;
}

const corners = { width: 10, height: 10 };
const commonclass = 'after:m-auto flex after:bg-blue-500';

const DroppedComponents: React.FC<DroppedComponentsProps> = ({ pageRefs, documentRef }) => {
  const [droppedComponents, setDroppedComponents] = useState<DroppedComponent[]>([]);
  const [draggingComponent, setDraggingComponent] = useState<{ component: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [elementId, setElementId] = useState(0);
    
  const textFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);

  // ----------------------
  // Drag Preview / Mouse
  // ----------------------
/*  const mouseDownOnField = (component: string, e: MouseEvent<HTMLDivElement>) => {
    setDraggingComponent({ component });
    setPosition({ x: e.clientX, y: e.clientY });
  };
*/
  const mouseMoveOnDropArea = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingComponent) {
      setPosition({ x: e.clientX - 65, y: e.clientY });
    }
  };

  const mouseLeaveOnDropArea = () => {
    setDraggingComponent(null);
  };

  const clickOnDropArea = (e: MouseEvent<HTMLDivElement>) => {
    if (!draggingComponent || !documentRef.current) return;

    const rect = documentRef.current.getBoundingClientRect();
    const newComponent: DroppedComponent = {
      id: elementId,
      component: draggingComponent.component,
      x: e.clientX - rect.left - 50,
      y: e.clientY - rect.top,
      width: 100,
      height: 50,
      pageNumber: 1,
    };

    setDroppedComponents(prev => [...prev, newComponent]);
    setElementId(prev => prev + 1);
    setDraggingComponent(null);
  };

  // ----------------------
  // Drag & Resize Handlers
  // ----------------------
  const handleDragStop = (item: DroppedComponent, data: { x: number; y: number }) => {
    if (!documentRef.current) return;

    const parentRect = documentRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;

    const fieldTopAbs = data.y + parentRect.top + scrollY;
    const fieldBottomAbs = fieldTopAbs + item.height;

    let newY = data.y;
    let newPageNumber = item.pageNumber;

    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (!pageEl) continue;

      const rect = pageEl.getBoundingClientRect();
      const pageTopAbs = rect.top + scrollY;
      const pageBottomAbs = pageTopAbs + rect.height;

      if (fieldTopAbs >= pageTopAbs && fieldBottomAbs <= pageBottomAbs) {
        newY = data.y;
        newPageNumber = i + 1;
        break;
      }

      if (fieldBottomAbs > pageTopAbs && fieldTopAbs < pageBottomAbs) {
        const distToTop = Math.abs(fieldTopAbs - pageTopAbs);
        const distToBottom = Math.abs(fieldBottomAbs - pageBottomAbs);
        newY = distToTop < distToBottom ? pageTopAbs - parentRect.top : pageBottomAbs - item.height - parentRect.top;
        newPageNumber = i + 1;
        break;
      }
    }

    setDroppedComponents(prev =>
      prev.map(c =>
        c.id === item.id ? { ...c, x: data.x, y: newY, pageNumber: newPageNumber } : c
      )
    );
  };

  const handleResizeStop = (item: DroppedComponent, ref: { style: { width: string; height: string } }, pos: { x: number; y: number }) => {
    setDroppedComponents(prev =>
      prev.map(c =>
        c.id === item.id ? { ...c, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : c
      )
    );
  };

  // ----------------------
  // Component Click
  // ----------------------
  const clickField = (e: MouseEvent<HTMLElement>, item: DroppedComponent) => {
    e.stopPropagation();
    if (isDragging) return setIsDragging(false);
    setDraggingComponent({ component: item.component });
  };

  const deleteField = (e: MouseEvent<Element>, item: DroppedComponent) => {
    e.stopPropagation();
    setDroppedComponents(prev => prev.filter(c => c.id !== item.id));
  };

  const updateField = (data: string | null, id: number) => {
    setDroppedComponents(prev =>
      prev.map(c => (c.id === id ? { ...c, data } : c))
    );
  };

  // ----------------------
  // Image Upload
  // ----------------------
  const onUploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await blobToURL(file);

    if (draggingComponent && 'component' in draggingComponent) {
      setDroppedComponents(prev =>
        prev.map(comp =>
          comp.id === elementId - 1 ? { ...comp, data: url } : comp
        )
      );
    }

    e.target.value = '';
  };

  // ----------------------
  // Render
  // ----------------------
  return (
    <>
      <input type="file" ref={imageRef} className="hidden" accept="image/png, image/jpeg" onChange={onUploadImage} />
      {draggingComponent && (
        <div
          className="bg-[#f4faff] border border-1 border-blue-300 px-2 text-center text-[12px] fixed min-w-[100px] z-[999999] left-[7px] top-[38px]"
          style={{
            transform: `translate(${position.x + 50}px, ${position.y + 2}px)`,
          }}
        >
          {draggingComponent.component}
        </div>
      )}

      <div
        className="relative flex-1"
        onClick={clickOnDropArea}
        onMouseMove={mouseMoveOnDropArea}
        onMouseLeave={mouseLeaveOnDropArea}
      >
        {droppedComponents.map((item) => (
          <Rnd
            key={item.id}
            bounds="parent"
            className="group absolute cursor-pointer bg-[#1ca4ff33] min-w-[100px] min-h-[50px] z-50 text-center"
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDrag={() => setIsDragging(true)}
            onDragStop={(e, data) => handleDragStop(item, data)}
            onClick={(e:React.MouseEvent<HTMLElement>) => clickField(e, item)}
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
            {item.data && (item.component === 'Signature' || item.component === 'Image') ? (
              <ImageField image={item.data} />
            ) : item.component === 'Text' ? (
              <MultilineTextField textInput={(text) => updateField(text, item.id)} ref={textFieldRef} />
            ) : item.component === 'Date' ? (
              <DateField textInput={(value) => updateField(value, item.id)} defaultDate={item.data ?? null} ref={textFieldRef as React.Ref<HTMLInputElement>} />
            ) : item.component.toLowerCase()}
          </Rnd>
        ))}
      </div>
    </>
  );
};

export default DroppedComponents;

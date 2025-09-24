"use client";
import React, { MouseEvent } from 'react';
import { Rnd, DraggableData } from 'react-rnd';
import { DroppedComponent } from '@/types/types';
import MultilineTextField from './MultilineTextField';
import DateField from './DateField';
import ImageField from './ImageField';
import { CircleX } from 'lucide-react';

interface DroppedComponentsProps {
  droppedComponents: DroppedComponent[];
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  clickField: (event: MouseEvent, item: DroppedComponent) => void;
  deleteField: (e: MouseEvent, item: DroppedComponent) => void;
  updateField: (data: string | null, id: number) => void;
  handleDragStop: (item: DroppedComponent, data: DraggableData) => void;
  handleResizeStop: (item: DroppedComponent, ref: { style: { width: string; height: string } }, pos: { x: number, y: number }) => void;
  textFieldRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;
}

const corners = { width: 10, height: 10 };
const commonclass = 'after:m-auto flex after:bg-blue-500';

const DroppedComponents: React.FC<DroppedComponentsProps> = ({ 
  droppedComponents,
  clickField,
  deleteField, 
  updateField,
  handleDragStop,
  handleResizeStop,
  textFieldRefs,
}) => {

  return (
    <>
      {droppedComponents.map((item) => (
          <Rnd
            key={item.id}
            bounds="parent"
            className="group absolute cursor-pointer bg-[#1ca4ff33] min-w-[100px] min-h-[50px] z-50 text-center"
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDragStop={(e, data) => handleDragStop(item, data)}
            onClick={(e: MouseEvent) => clickField(e, item)}
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
              left: `${commonclass} after:h-1/2 after:w-[1/2] after:ml-0`,
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
              (item.component == "Signature" || item.component === 'Image' || item.component === 'Realtime Photo') ? <ImageField image={item.data} /> :
              item.component == "Text" ? <MultilineTextField textInput={(text) => updateField(text, item.id)} ref={(el) => { textFieldRefs.current[item.id] = el; }} /> :
              item.component == "Date" ? <DateField textInput={(value) => updateField(value, item.id)} defaultDate={item.data ?? null}/> : (item.component === 'Realtime Photo' ? "Click to capture " : '') + item.component.toLowerCase()

            }
          </Rnd>
        ))}
    </>
  );
};

export default DroppedComponents;

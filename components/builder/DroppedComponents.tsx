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
            className="absolute cursor-pointer bg-[#1ca4ff33] min-w-[100px] min-h-[50px] z-50 text-center"
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDragStop={(e, data) => handleDragStop(item, data)}
            onClick={(e: MouseEvent) => clickField(e, item)}
            onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(item, ref, position)}
            resizeHandleStyles={{
              topLeft: { ...corners, left: 0, top: 0 },
              topRight: { ...corners, right: 0, top: 0 },
              bottomLeft: { ...corners, left: 0, bottom: 0 },
              bottomRight: { ...corners, right: 0, bottom: 0 },
            }}
            resizeHandleClasses={{
              bottomLeft: 'bg-gray-200 rounded-full border border-blue-500 -m-1',
              bottomRight: 'bg-gray-200 rounded-full border border-blue-500 -m-1',
              topLeft: 'bg-gray-200 rounded-full border border-blue-500 -m-1',
              topRight: 'bg-gray-200 rounded-full border border-blue-500 -m-1'
            }}
            resizeHandleWrapperClass="group-hover:block"
          >
            <div className='absolute left-1/2 -top-6 transform -translate-x-1/2 cursor-pointer p-1'>
            <CircleX
              size={18}
              color="red"
              onClick={(e) => deleteField(e, item)}
            />
            </div>
            <div className='flex items-center justify-center h-full  w-full border border-blue-500 p-1'>
            {item.data &&
              (item.component == "Signature" || item.component === 'Image' || item.component === 'Realtime Photo') ? <ImageField image={item.data} /> :
              item.component == "Text" ? <MultilineTextField textInput={(text) => updateField(text, item.id)} ref={(el) => { textFieldRefs.current[item.id] = el; }} /> :
              item.component == "Date" ? <DateField textInput={(value) => updateField(value, item.id)} defaultDate={item.data ?? null}/> : (item.component === 'Realtime Photo' ? "Click to capture " : '') + item.component.toLowerCase()
            }
            </div>
          </Rnd>
        ))}
    </>
  );
};

export default DroppedComponents;

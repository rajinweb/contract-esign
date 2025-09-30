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
  deleteField: (e: MouseEvent, item: DroppedComponent) => void;
  updateField: (data: string | null, id: number) => void;
  handleDragStop: (e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => void;
  handleResizeStop: (
    e: MouseEvent | TouchEvent,
    item: DroppedComponent, 
    ref: { style: { width: string; height: string } }, 
    pos: { x: number, y: number }
  ) => void;
  textFieldRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;
  zoom: number;
  recipients?: any[];
  onRightClickField?: (e: React.MouseEvent, field: DroppedComponent) => void;
}

const DroppedComponents: React.FC<DroppedComponentsProps> = ({ 
  droppedComponents,
  deleteField, 
  updateField,
  handleDragStop,
  handleResizeStop,
  textFieldRefs,
  zoom,
  recipients = [],
  onRightClickField,
}) => {
  const getAssignedRecipient = (recipientId?: string) => {
    return recipients.find(r => r.id === recipientId);
  };

  return (
    <>
      {droppedComponents.map((item) => {
        const assignedRecipient = getAssignedRecipient(item.assignedRecipientId || undefined);
        
        return (
          <Rnd
            key={item.id}
            scale={zoom}
            bounds="parent"
            className={`absolute cursor-pointer min-w-[150px] min-h-[50px] z-50 text-center text-sm ${
              assignedRecipient 
                ? 'border-2' 
                : 'bg-[#1ca4ff33]'
            }`}
            style={assignedRecipient ? { 
              backgroundColor: `${assignedRecipient.color}33`,
              borderColor: assignedRecipient.color 
            } : {}}
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDragStop={(e, data) => handleDragStop(e as MouseEvent, item, data)}
            onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(e as unknown as MouseEvent, item, ref, position)}
            onContextMenu={(e:any) => onRightClickField?.(e, item)}
            resizeHandleClasses={{
              bottomLeft: `${assignedRecipient ? 'bg-' + assignedRecipient.color : 'bg-blue-500'} !w-4 !h-4 rounded-full border-2 border-white`,
              bottomRight: `${assignedRecipient ? 'bg-' + assignedRecipient.color : 'bg-blue-500'} !w-4 !h-4 rounded-full border-2 border-white`,
              topLeft: `${assignedRecipient ? 'bg-' + assignedRecipient.color : 'bg-blue-500'} !w-4 !h-4 rounded-full border-2 border-white`,
              topRight: `${assignedRecipient ? 'bg-' + assignedRecipient.color : 'bg-blue-500'} !w-4 !h-4 rounded-full border-2 border-white`
            }}
          >
            {/* Assignment indicator */}
            {assignedRecipient && (
              <div 
                className="absolute -top-6 left-0 text-xs px-2 py-1 rounded text-white"
                style={{ backgroundColor: assignedRecipient.color }}
              >
                {assignedRecipient.name}
              </div>
            )}
            
            <div className="absolute left-1/2 -top-6  transform -translate-x-1/2 cursor-pointer p-1 z-10 delete-button-wrapper">
              <CircleX
                size={18}
                color="red"
                onClick={(e) => deleteField(e, item)}
              />
            </div>
            <div className={`flex items-center justify-center h-full w-full p-1 ${
              assignedRecipient ? '' : 'border border-blue-500'
            }`}>
            {item.data &&
              (item.component == "Signature" || item.component === 'Image' || item.component === 'Realtime Photo') ? <ImageField image={item.data} /> :
              item.component == "Text" ? <MultilineTextField textInput={(text) => updateField(text, item.id)} ref={(el) => { textFieldRefs.current[item.id] = el; }} /> :
              item.component == "Date" ? <DateField textInput={(value) => updateField(value, item.id)} defaultDate={item.data ?? null}/> : (item.component === 'Realtime Photo' ? "Click to capture " : '') + item.component.toLowerCase()
            }
            </div>
          </Rnd>
        );
      })}
    </>
  );
};

export default DroppedComponents;
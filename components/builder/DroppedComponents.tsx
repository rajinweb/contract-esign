"use client";
import React, { MouseEvent } from 'react';
import { Rnd, DraggableData } from 'react-rnd';
import { DroppedComponent } from '@/types/types';
import MultilineTextField from './MultilineTextField';
import DateField from './DateField';
import ImageField from './ImageField';
import FieldSelectionMenu from './FieldSelectionMenu';
import { Recipient } from '@/types/types';

interface DroppedComponentsProps {
  droppedComponents: DroppedComponent[];
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  selectedFieldId: number | null;
  setSelectedFieldId: React.Dispatch<React.SetStateAction<number | null>>;
  recipients: Recipient[];
  onAssignRecipient: (fieldId: number, recipientId: string | null) => void;
  onDuplicateField: (field: DroppedComponent) => void;
  onDeleteField: (field: DroppedComponent) => void;
  updateField: (data: string | null, id: number) => void;
  handleDragStop: (e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => void;
  handleResizeStop: (
    e: MouseEvent | TouchEvent,
    item: DroppedComponent, 
    ref: { style: { width: string; height: string } }, 
    pos: { x: number, y: number }, 
    delta: { width: number, height: number }
  ) => void;
  textFieldRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;
  zoom: number;
}

const DroppedComponents: React.FC<DroppedComponentsProps> = ({ 
  droppedComponents,
  selectedFieldId,
  setSelectedFieldId,
  recipients,
  onAssignRecipient,
  onDuplicateField,
  onDeleteField,
  updateField,
  handleDragStop,
  handleResizeStop,
  textFieldRefs,
  zoom,
}) => {
  const handleFieldClick = (e: MouseEvent, field: DroppedComponent) => {
    e.stopPropagation();
    setSelectedFieldId(field.id === selectedFieldId ? null : field.id);
  };

  return (
    <>
      {droppedComponents.map((item) => (
          <Rnd
        const isSelected = selectedFieldId === item.id;
            key={item.id}
            scale={zoom}
            bounds="parent"
            className={`absolute cursor-pointer min-w-[150px] min-h-[50px] z-50 text-center text-sm ${
              isSelected ? 'bg-[#1ca4ff66]' : 'bg-[#1ca4ff33]'
            }`}
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDragStop={(e, data) => handleDragStop(e as MouseEvent, item, data)}
            onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(e as unknown as MouseEvent, item, ref, position, delta)}
            onClick={(e) => handleFieldClick(e as unknown as MouseEvent, item)}
            resizeHandleClasses={{
              bottomLeft: 'bg-blue-500 !w-4 !h-4 rounded-full border-2 border-white',
              bottomRight: 'bg-blue-500 !w-4 !h-4 rounded-full border-2 border-white',
              topLeft: 'bg-blue-500 !w-4 !h-4 rounded-full border-2 border-white',
              topRight: 'bg-blue-500 !w-4 !h-4 rounded-full border-2 border-white'
            }}
          >
            {/* Field Selection Menu */}
            {isSelected && (
              <FieldSelectionMenu
                field={item}
                recipients={recipients || []}
                onAssignRecipient={onAssignRecipient}
                onDuplicateField={onDuplicateField}
                onDeleteField={onDeleteField}
              />
            )}

            <div className='flex items-center justify-center h-full  w-full border border-blue-500 p-1'>
              {/* Assigned Recipient Indicator */}
              {assignedRecipient && (
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs border-2 border-white"
                  style={{ backgroundColor: assignedRecipient.color }}
                  title={`Assigned to ${assignedRecipient.name}`}
                >
                  {assignedRecipient.name.charAt(0).toUpperCase()}
                </div>
              )}

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

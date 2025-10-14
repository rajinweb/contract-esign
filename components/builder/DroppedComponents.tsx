"use client";
import React, { MouseEvent, useEffect, useRef } from 'react';
import { Rnd, DraggableData } from 'react-rnd';
import { DroppedComponent, Recipient } from '@/types/types';
import MultilineTextField from './MultilineTextField';
import DateField from './DateField';
import ImageField from './ImageField';
import FieldSelectionMenu from './FieldSelectionMenu';

interface DroppedComponentsProps {
  droppedComponents: DroppedComponent[];
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  selectedFieldId: number | null;
  setSelectedFieldId: React.Dispatch<React.SetStateAction<number | null>>;
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
  recipients?: Recipient[];
  onAddRecipients: () => void;
  onClickField: (event: React.MouseEvent<Element>, item: DroppedComponent) => void;
  isSigningMode:boolean;
  currentRecipientId?: string;
}

const DroppedComponents: React.FC<DroppedComponentsProps> = ({ 
  droppedComponents,
  selectedFieldId,
  setSelectedFieldId,
  onAssignRecipient,
  onDuplicateField,
  onDeleteField,
  updateField,
  handleDragStop,
  handleResizeStop,
  textFieldRefs,
  zoom,
  recipients = [],
  onAddRecipients,
  onClickField,
  isSigningMode,
  currentRecipientId
}) => {
  const rndFields=useRef<Rnd>(null);
  const getAssignedRecipient = (recipientId?: string) => {
    return recipients?.find(r => r.id === recipientId);
  };

  const handleFieldClick = (e: MouseEvent, field: DroppedComponent) => {
    e.stopPropagation();
    setSelectedFieldId(field.id === selectedFieldId ? null : field.id);
     if(isSigningMode){ onClickField(e, field)}
  };
  useEffect(()=>{
  if(!isSigningMode){
   const el = rndFields?.current?.resizableElement.current;
   if (el) { el.click() } // trigger new field dropped on pdf
   }
  }, [droppedComponents, isSigningMode])
  
  const cornersCSS='bg-blue-500 !w-3 !h-3 rounded-full '
  const assignedLabel='after:content-[attr(data-name)] after:block after:rounded-sm after:bg-[inherit] after:w-1/2 after:whitespace-nowrap after:text-ellipsis after:p-0.5 after:text-xs after:overflow-hidden';
  return (
    <>
      {droppedComponents.map((item) => {
        const assignedRecipient = getAssignedRecipient(item.assignedRecipientId || undefined);
        const isSelected = selectedFieldId === item.id;
        const isCurrentUserField = isSigningMode ? item.assignedRecipientId === currentRecipientId : true;

        return (
          <Rnd
            key={item.id}
            scale={zoom}
            bounds="parent"
            ref={rndFields}
            className={`absolute cursor-pointer min-w-[150px] min-h-[50px] z-50 text-center text-sm ${
              assignedRecipient  ? 'border-2 '  : 'bg-[#1ca4ff33]'
            } ${isSelected ? 'bg-[#1ca4ff66]' : ''}            
            ${ assignedRecipient && assignedLabel}
            ${!isCurrentUserField ? 'opacity-50' : ''}
            `}
            style={assignedRecipient ? { 
              backgroundColor: `${assignedRecipient.color}33`,
              borderColor: assignedRecipient.color 
            } : {}}
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDragStop={(e, data) => handleDragStop(e as MouseEvent, item, data)}
            onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(e as unknown as MouseEvent, item, ref, position, delta)}
          
            {...(!isSigningMode && isSelected && {
                resizeHandleClasses: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'].reduce(
                  (acc, key) => ({ ...acc, [key]: cornersCSS }),
                  {}
                ),
                ...(assignedRecipient && {
                  resizeHandleStyles: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'].reduce(
                    (acc, position) => {
                      acc[position] = { backgroundColor: `${assignedRecipient.color}33` };
                      return acc;
                    },
                    {} as Record<string, React.CSSProperties>
                  ),
                })
              }
            )}
            onClick={(e: React.MouseEvent) => {
              if (isCurrentUserField) {
                handleFieldClick(e as unknown as MouseEvent, item);
              }
            }}
            disableDragging={isSigningMode}  
            enableResizing={!isSigningMode}  
            data-name={assignedRecipient?.name}
          >
            {/* Field Selection Menu */}
            {isSelected && !isSigningMode &&(
              <FieldSelectionMenu
                field={item}
                recipients={recipients || []}
                onAssignRecipient={onAssignRecipient}
                onDuplicateField={onDuplicateField}
                onDeleteField={()=> onDeleteField(item)}
                onAddRecipients={onAddRecipients}
              />
            )}
            <div className={`flex items-center justify-center h-full w-full p-1 ${
              assignedRecipient ? '' : 'border border-blue-500'
            }`}>
            {item.data &&
              (item.component == "Signature" || item.component === 'Image' || item.component === 'Realtime photo') ? <ImageField image={item.data} /> :
              item.component == "Text" ? <MultilineTextField value={item.data || ''} readOnly={!isCurrentUserField} textInput={(text) => updateField(text, item.id)} ref={(el) => { textFieldRefs.current[item.id] = el; }} /> :
              item.component == "Date" ? <DateField textInput={(value) => updateField(value, item.id)} defaultDate={item.data ?? null}/> : (item.component === 'Realtime photo' ? "Click to capture " : '') + item.component.toLowerCase()
            }
            </div>
          </Rnd>
        );
      })}
    </>
  );
};

export default DroppedComponents;
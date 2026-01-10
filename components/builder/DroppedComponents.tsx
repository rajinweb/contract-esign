"use client";
import React, { MouseEvent, useMemo, useCallback } from 'react';
import { Rnd, DraggableData } from 'react-rnd';
import { DroppedComponent, Recipient } from '@/types/types';
import MultilineTextField from './MultilineTextField';
import DateField from './DateField';
import ImageField from './ImageField';
import Input from '../forms/Input';
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
  isSigned?:boolean;
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
  isSigned,
  currentRecipientId
}) => {
  /* ---------------------------------- */
  /* Recipient lookup  */
  /* ---------------------------------- */
  const recipientMap = useMemo(() => {
    const map = new Map<string, Recipient>();
    recipients.forEach(r => map.set(r.id, r));
    return map;
  }, [recipients]);

  /* ---------------------------------- */
  /* Resize handles                     */
  /* ---------------------------------- */
  const cornersCSS = 'bg-blue-500 !w-3 !h-3 rounded-full';
  const resizeHandleClasses = useMemo(
    () => ({
      bottomLeft: cornersCSS,
      bottomRight: cornersCSS,
      topLeft: cornersCSS,
      topRight: cornersCSS,
    }),
    []
  );

  const assignedLabel =
    'after:content-[attr(data-name)] after:block after:rounded-sm after:bg-[inherit] after:w-1/2 after:whitespace-nowrap after:text-ellipsis after:p-0.5 after:text-xs after:overflow-hidden';

  /* ---------------------------------- */
  /* Field renderer                     */
  /* ---------------------------------- */
  const renderField = useCallback(
    (item: DroppedComponent, isFieldReadOnly: boolean) => {
      const value = item.data || '';

      switch (item.component) {
        case 'Signature':
        case 'Image':
        case 'Live Photo':
          return item.data ? (
            <ImageField image={item.data} />
          ) : item.component === 'Live Photo' ? (
            'Click to capture Live Photo'
          ) : (
            item.component.toLowerCase()
          );

        case 'Text':
        case 'Full Name':
        case 'Initials':
          return (
            <MultilineTextField
              value={value}
              readOnly={isFieldReadOnly}
              textInput={(text) => updateField(text, item.id)}
              ref={(el) => {
                textFieldRefs.current[item.id] = el;
              }}
            />
          );

        case 'Email':
          return (
            <Input
              value={value}
              readOnly={isFieldReadOnly}
              onChange={(e) => updateField(e.target.value, item.id)}
              className="text-xs text-center w-full h-full"
              placeholder={
                item.fieldOwner === 'recipients'
                  ? 'Type an email address or select recipient'
                  : ''
              }
            />
          );

        case 'Date':
          return (
            <DateField
              textInput={(date) => updateField(date, item.id)}
              defaultDate={item.data ?? null}
              readOnly={isFieldReadOnly}
            />
          );

        default:
          return item.component.toLowerCase();
      }
    },
    [updateField, textFieldRefs]
  );

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */
  return (
    <>
      {droppedComponents.map((item) => {
        const assignedRecipient = item.assignedRecipientId ? recipientMap.get(item.assignedRecipientId) : undefined;
        const isSelected = selectedFieldId === item.id;
        const isCurrentUserField = isSigningMode ? item.assignedRecipientId === currentRecipientId : true;
        const isFieldReadOnlyInSigning = isSigningMode && (!isCurrentUserField || isSigned);
        const isReadOnlyMeField = item.fieldOwner === 'me' && ['Full Name', 'Email', 'Initials'].includes(item.component);
        const isFieldReadOnly = isFieldReadOnlyInSigning || isReadOnlyMeField;
        const handleClick = (e: React.MouseEvent) => {
          if (!isCurrentUserField || isFieldReadOnly) return;
          e.stopPropagation();
          setSelectedFieldId(isSelected ? null : item.id);
          onClickField(e, item);
        };
        return (
          <Rnd
            key={item.id}
            scale={zoom}
            bounds="parent"
            className={`absolute cursor-pointer min-w-[150px] min-h-[50px] text-center text-sm
              ${assignedRecipient ? 'border-2' : 'bg-[#1ca4ff33]'}
              ${isSelected ? 'bg-[#1ca4ff66]' : ''}
            ${assignedRecipient ? assignedLabel : ''}
            ${!isCurrentUserField ? 'opacity-50' : ''}
            `}
            style={{
              zIndex: isSelected ? 99 : 10,
              ...(assignedRecipient && {
                backgroundColor: `${assignedRecipient.color}33`,
                borderColor: assignedRecipient.color,
              }),
            }}
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
            onClick={handleClick}
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
              {renderField(item, isFieldReadOnly)}
            </div>
          </Rnd>
        );
      })}
    </>
  );
};

export default DroppedComponents;
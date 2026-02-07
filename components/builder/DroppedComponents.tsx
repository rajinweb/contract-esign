"use client";
import React, { useMemo, useCallback } from 'react';
import { Rnd, DraggableData } from 'react-rnd';
import { DroppedComponent, Recipient } from '@/types/types';
import MultilineTextField from './MultilineTextField';
import DateField from './DateField';
import ImageField from './ImageField';
import Input from '../forms/Input';
import FieldSelectionMenu from './FieldSelectionMenu';
import Initials from './Initials';
import { validateEmail } from '@/utils/utils';
import { Button } from '../Button';
import { GripVertical, Pencil } from 'lucide-react';

interface DroppedComponentsProps {
  droppedComponents: DroppedComponent[];
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  selectedFieldId: number | null;
  setSelectedFieldId: React.Dispatch<React.SetStateAction<number | null>>;
  onSelectField: (field: DroppedComponent) => void;
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
    delta?: { width: number, height: number }
  ) => void;
  textFieldRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement | null>>;
  zoom: number;
  recipients?: Recipient[];
  onAddRecipients: () => void;
  onClickField: (event: React.MouseEvent<Element>, item: DroppedComponent, isEdit?:boolean) => void;
  isSigningMode:boolean;
  isReadOnly?: boolean;
  isSigned?:boolean;
  currentRecipientId?: string;
}

const DroppedComponents: React.FC<DroppedComponentsProps> = ({ 
  droppedComponents,
  selectedFieldId,
  setSelectedFieldId,
  onSelectField,
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
  isReadOnly = false,
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
      case 'Stamp':
      case 'Signature':
      case 'Initials':
        return(
          <Initials
            key={`${item.id}-${item.data}`}
            value={
              item.fieldOwner === "me"
                ? item.data ? item.data : `Add ${item.component}`// your own signature
                : item.fieldOwner === "recipients" && item.data
                ? item.data // recipient already signed
                : isSigningMode
                ? value // currently signing
                : `Add ${item.component}` // placeholder
            }
            width={item.width}
            height={item.height}
          />
        )
        case 'Email':
          return (
            <Input
              value={value}
              readOnly={isFieldReadOnly}
              onChange={(e) => updateField(e.target.value, item.id)}
              className="text-xs text-center w-full h-full !p-1 !leading-tight truncate"
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
              className="text-xs text-center w-full h-full !p-1 !leading-tight"
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
        const isReadOnlyMeField = item.fieldOwner === 'me' && [''].includes(item.component);
        const isFieldReadOnly = isReadOnly || isFieldReadOnlyInSigning || isReadOnlyMeField;
       
        let checkEmail = false;
        if (item.data && item.component === 'Email') {
          checkEmail = !validateEmail(item.data);
        }
        const shouldValidate = item.fieldOwner === 'me' || (item.fieldOwner === 'recipients' && isSigningMode);
        const hasError = shouldValidate && (item.hasError || !item.data || checkEmail);

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
              ...(hasError && {
                backgroundColor: `#ff000033`,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'red',
              }),
            }}
            position={{ x: item.x, y: item.y }}
            size={{ width: item.width, height: item.height }}
            onDragStop={(e, data) => handleDragStop(e as MouseEvent, item, data)}
            onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(e, item, ref, position, delta)}
          
            {...(!isSigningMode && !isReadOnly && isSelected && {
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
            onClick={(e: React.MouseEvent<HTMLDivElement>) =>  {
              if (!isCurrentUserField || isFieldReadOnly) return;
              e.stopPropagation();
              setSelectedFieldId(isSelected ? null : item.id)
              if (!isSigningMode && !isReadOnly) {
                onSelectField(item);
              }
              if (item.fieldOwner === 'me' && !isSigningMode) return;
              onClickField(e, item);
            }}
            disableDragging={isSigningMode || isReadOnly}
            enableResizing={!isSigningMode && !isReadOnly}
            data-name={assignedRecipient?.name}
          >
            {/* Field Selection Menu */}
            {isSelected && !isSigningMode && !isReadOnly && (
              <>
              <div className="absolute -top-12 left-0 right-0 z-50 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
               {item.fieldOwner === 'me' && !isSigningMode && (
                <Button
                  onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                    if (!e) return;
                    onClickField(e, item, true);
                  }}
                  className="shadow-lg"
                  title="Change or Add value in the field"
                  icon={<Pencil size={16} className="text-gray-600" />}
                  inverted
                />
              )}
              <FieldSelectionMenu
                field={item}
                recipients={recipients || []}
                onAssignRecipient={onAssignRecipient}
                onDuplicateField={onDuplicateField}
                onDeleteField={()=> onDeleteField(item)}
                onAddRecipients={onAddRecipients}
              />
            </div>            
             {/* Drag Handle Button */}
            {!isSigningMode && !isReadOnly && <Button
              className="absolute -left-6 top-1 !p-0 !w-5 !ring-0 cursor-grab active:cursor-grabbing"
              title="Drag to move field"
              onClick={(e) => e?.stopPropagation()}
              icon={ <GripVertical size={20} />}
            />}
            </>
            )}
            <div className={`flex items-center justify-center h-full w-full p-1 overflow-hidden ${
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

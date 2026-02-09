import React, { useState, useRef, useCallback, useEffect } from "react";
import { Recipient, ROLES } from "@/types/types";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "../Button";

interface RecipientsListProps {
  recipients: Recipient[];
  onAddRecipients?: () => void;
  onReorder?: (reorderedRecipients: Recipient[]) => void;
  isDraggable?: boolean;
  inlineView?: boolean;
  showStatus?: boolean;
}

interface DragState {
  draggingId: string | null;
  draggedY: number;
  offsetY: number;
}

const RecipientsList = React.memo(function RecipientsList({
  recipients = [],
  onAddRecipients,
  onReorder,
  isDraggable = false, 
  inlineView = false,
  showStatus = false,
}: RecipientsListProps) {
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    draggedY: 0,
    offsetY: 0,
  });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const itemHeight = 48;
  const itemGap = 8;

  const statusStyles: Record<string, string> = {
    signed: 'bg-green-100 text-green-700',
    approved: 'bg-emerald-100 text-emerald-700',
    viewed: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-100 text-red-700',
    delivery_failed: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, recipientId: string) => {
      if (!isDraggable) return;

      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;

      setDragState({
        draggingId: recipientId,
        draggedY: offsetY,
        offsetY,
      });
    },
    [isDraggable]
  );

  useEffect(() => {
    if (!isDraggable || !dragState.draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      setDragState((prev) => ({
        ...prev,
        draggedY: y,
      }));

      const overIndex = Math.max(
        0,
        Math.floor((y - itemHeight / 2) / (itemHeight + itemGap))
      );

      setDragOverIndex(Math.min(overIndex, recipients.length - 1));
    };

    const handleMouseUp = () => {
      if (
        dragOverIndex !== null &&
        dragState.draggingId &&
        isDraggable
      ) {
        const currentIndex = recipients.findIndex(
          (r) => r.id === dragState.draggingId
        );

        if (currentIndex !== dragOverIndex) {
          const reordered = [...recipients];
          const [moved] = reordered.splice(currentIndex, 1);
          reordered.splice(dragOverIndex, 0, moved);

          onReorder?.(
            reordered.map((r, idx) => ({
              ...r,
              order: idx + 1,
            }))
          );
        }
      }

      setDragState({ draggingId: null, draggedY: 0, offsetY: 0 });
      setDragOverIndex(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDraggable,
    dragState.draggingId,
    dragOverIndex,
    recipients,
    onReorder,
  ]);

  return (
    <>
    { onAddRecipients && (
      <div className="bg-gray-50 border-b flex items-center justify-between p-4 text-xs">
        <span>Recipients: {recipients.length}</span>
        <Button
          className="p-1 rounded-full"
          onClick={onAddRecipients}
          title="Add Recipient"
          icon={<Plus size={16} />}
        />
      </div>
      )}
      {/* List */}
      <div ref={containerRef} id="recipient-list-container" className="space-y-2 p-4 flex-1 overflow-y-auto"
      >
        {recipients.length === 0 ? (
          <div className="bg-blue-50 flex items-center p-1 rounded-md text-xs">
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mx-2">
              N
            </div>
            <div className="text-gray-800">
              No Recipient assigned yet.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recipients.map((recipient, index) => {
              const roleDef = ROLES.find(
                (r) => r.value === recipient.role
              );
              const Icon = roleDef?.icon;

              const isDragging =
                dragState.draggingId === recipient.id;

              const isOverIndex =
                isDraggable &&
                dragOverIndex === index &&
                dragState.draggingId;

              return (
                <div key={recipient.id}  >
                  {isOverIndex &&
                    dragState.draggingId !== recipient.id && (
                      <div className="h-1 bg-blue-400 rounded-full mb-2 transition-all duration-150" />
                    )}

                  <div
                    onMouseDown={(e) => handleMouseDown(e, recipient.id) }
                    className={`flex items-center ${inlineView ? 'bg-white': ''} gap-2 rounded-md text-xs p-2 w-full select-none transition-all
                      ${isDraggable 
                        ? isDragging
                          ? "shadow-xl opacity-70 border-2 border-blue-400 cursor-grabbing scale-105"
                          : "shadow-sm hover:shadow-md cursor-grab bg-blue-50"
                        : "bg-blue-50 cursor-default"
                      }   
                    `}
                    title={`${recipient.email}, ${recipient.role}`}
                  >
                    {/* Drag handle (ONLY when draggable) */}
                    {isDraggable && (
                      <div
                        className="flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-600"
                        title="Drag to reorder"
                      >
                        <GripVertical size={16} />
                      </div>
                    )}
                    {inlineView ? ( 
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: recipient.color }}>
                          {recipient.order}
                        </div>
                        <span className="font-medium">{recipient.name}</span>
                        <span className="text-gray-600">({recipient.email})</span>
                        <small className=" bg-blue-100 text-blue-700 px-2  rounded">
                        {recipient.role}
                      </small>
                    </div>
                    ):(
                      <>                
                    <div
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white font-semibold"
                      style={{ backgroundColor: recipient.color }} >
                      {recipient.name ? recipient.name.charAt(0).toUpperCase() : "R"}
                    </div>
                    <div className="text-gray-800 flex-1 overflow-hidden">
                      <span className="block w-full text-gray-500 truncate">
                        {recipient.email}
                      </span>
                      <span className="flex items-center gap-1">
                        {Icon && <Icon size={12} />}
                        {recipient.totalFields} fields
                      </span>
                      {showStatus && (
                        <div className="mt-1 flex items-center gap-2 text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded-full uppercase tracking-wide ${statusStyles[recipient.status] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {recipient.status?.replace('_', ' ')}
                          </span>
                          {recipient.status === 'signed' && recipient.signedAt && (
                            <span className="text-gray-500">
                              {new Date(recipient.signedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                      {/* <div className="w-5 h-5 flex items-center justify-center rounded-full text-white text-[10px] font-semibold"
                      style={{ backgroundColor: recipient.color }}> {recipient.order} 
                      </div> */}
                    </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
});

export default RecipientsList;

"use client";
import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { DraggableData } from 'react-rnd';
import { blobToURL } from '@/lib/pdf';
import { DroppedComponent, DroppingField, FieldOwner, Recipient, SignatureInitial, User } from '@/types/types';

interface UseFieldInteractionsArgs {
  isSigningMode: boolean;
  currentPage: number;
  zoom: number;
  user: User | null;
  defaults: {
    signature?: SignatureInitial | null;
    initial?: SignatureInitial | null;
    stamp?: SignatureInitial | null;
  };
  recipients: Recipient[];
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>;
  draggingComponent: DroppingField | null;
  setDraggingComponent: React.Dispatch<React.SetStateAction<DroppingField | null>>;
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  elementId: number;
  setElementId: React.Dispatch<React.SetStateAction<number>>;
  setDroppedComponents: React.Dispatch<React.SetStateAction<DroppedComponent[]>>;
  saveState: (components: DroppedComponent[]) => void;
  documentRef: React.RefObject<HTMLDivElement>;
  pageRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  setSelectedFieldId: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedFieldForDialog: React.Dispatch<React.SetStateAction<DroppedComponent | null>>;
  setCanvasFields: React.Dispatch<React.SetStateAction<boolean>>;
  setPhotoDialog: React.Dispatch<React.SetStateAction<boolean>>;
  imageRef: React.RefObject<HTMLInputElement>;
}

export const useFieldInteractions = ({
  isSigningMode,
  currentPage,
  zoom,
  user,
  defaults,
  recipients,
  setRecipients,
  draggingComponent,
  setDraggingComponent,
  setPosition,
  elementId,
  setElementId,
  setDroppedComponents,
  saveState,
  documentRef,
  pageRefs,
  setSelectedFieldId,
  setSelectedFieldForDialog,
  setCanvasFields,
  setPhotoDialog,
  imageRef,
}: UseFieldInteractionsArgs) => {
  const isPaletteDrag = useCallback(
    (candidate: DroppingField | null) => {
      if (!candidate) return false;
      const candidateId = (candidate as unknown as { id?: unknown }).id;
      return typeof candidateId !== 'number';
    },
    []
  );

  const handleDragStart = useCallback(() => {
    document.body.classList.add('dragging-no-select');
  }, []);

  const mouseDownOnField = useCallback(
    (component: string, e: ReactMouseEvent<HTMLDivElement>, fieldOwner: FieldOwner) => {
      const xy = { x: e.clientX, y: e.clientY };
      let data: string | null | undefined;
      if (fieldOwner === 'me') {
        if (component === 'Full Name') {
          data = user?.name;
        }
        if (component === 'Email') {
          data = user?.email;
        }
        if (component === 'Initials') {
          data = defaults.initial?.value || user?.name?.split(' ').map(n => n[0]).join('').toUpperCase();
        } else if (component === 'Signature') {
          data = defaults.signature?.value;
        }
        if (component === 'Date') {
          data = new Date().toISOString().split('T')[0];
        }
      }
      setDraggingComponent({ component, ...xy, fieldOwner, data: data ?? null });
      setPosition(xy);
      handleDragStart();
    },
    [defaults, handleDragStart, setDraggingComponent, setPosition, user]
  );

  const mouseMoveOnDropArea = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPaletteDrag(draggingComponent)) return;
    setPosition({ x: e.clientX - 65, y: e.clientY });
  }, [draggingComponent, isPaletteDrag, setPosition]);

  const clickOnDropArea = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (isSigningMode) {
      return;
    }
    if (
      !draggingComponent ||
      !isPaletteDrag(draggingComponent) ||
      (e.target instanceof HTMLElement && e.target.closest('.react-draggable')) ||
      (e.target instanceof HTMLElement && e.target?.closest('.page-brake'))
    ) {
      return;
    }

    setSelectedFieldId(null);

    const rect = documentRef.current?.getBoundingClientRect();
    if (!rect) return;
    let targetPageNumber = currentPage;
    const dropY = e.clientY;
    let pageRect: DOMRect | null = null;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (!pageEl) continue;

      pageRect = pageEl.getBoundingClientRect();
      if (dropY >= pageRect.top && dropY <= pageRect.bottom) {
        targetPageNumber = i + 1;
        break;
      }
    }
    const newComponent: DroppedComponent = {
      id: elementId,
      fieldId: String(elementId),
      component: draggingComponent.component,
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
      width: 100,
      height: 50,
      pageNumber: targetPageNumber,
      pageRect: pageRect,
      fieldOwner: draggingComponent.fieldOwner,
      data: draggingComponent.data,
    };

    setDroppedComponents((prev) => {
      const newComponents = [...prev, newComponent].map(c => {
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });
      saveState(newComponents);
      return newComponents;
    });
    setElementId((id) => id + 1);
    setDraggingComponent(null);
  }, [
    currentPage,
    documentRef,
    draggingComponent,
    elementId,
    isSigningMode,
    isPaletteDrag,
    pageRefs,
    recipients,
    saveState,
    setDroppedComponents,
    setElementId,
    setDraggingComponent,
    setSelectedFieldId,
    zoom,
  ]);

  const handleDeleteField = useCallback((item: DroppedComponent) => {
    setDroppedComponents((prev) => {
      const newComponents = prev.filter((c) => c.id !== item.id);
      saveState(newComponents);
      return newComponents;
    });
    setSelectedFieldId(null);
  }, [saveState, setDroppedComponents, setSelectedFieldId]);

  const handleDuplicateField = useCallback((item: DroppedComponent) => {
    const newComponent: DroppedComponent = {
      ...item,
      id: elementId,
      fieldId: String(elementId),
      x: item.x + 20,
      y: item.y + 20,
      assignedRecipientId: item.assignedRecipientId
    };

    setDroppedComponents((prev) => {
      const newComponents = [...prev, newComponent].map(c => {
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && recipient.status === 'signed') {
          const prevComponent = prev.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });
      saveState(newComponents);
      return newComponents;
    });
    setElementId((id) => id + 1);
    setSelectedFieldId(newComponent.id);
  }, [elementId, recipients, saveState, setDroppedComponents, setElementId, setSelectedFieldId]);

  const handleAssignRecipient = useCallback((fieldId: number, recipientId: string | null) => {
    setDroppedComponents((prevComponents) => {
      let previousRecipientId: string | null | undefined;
      const newComponents = prevComponents.map((c) => {
        if (c.id === fieldId) {
          previousRecipientId = c.assignedRecipientId;
          const recipient = recipients.find(r => r.id === recipientId);
          let data = c.data;
          if (c.component === 'Email' && recipient) {
            data = recipient.email;
          }
          return { ...c, assignedRecipientId: recipientId, data };
        }
        return c;
      });

      setRecipients((prevRecipients) =>
        prevRecipients.map((r) => {
          const assignedCount = newComponents.filter(
            (c) => c.assignedRecipientId === r.id
          ).length;

          const shouldResetStatus =
            recipientId !== null &&
            r.id === recipientId &&
            (r.status === 'signed' || r.status === 'approved') &&
            previousRecipientId !== recipientId;

          if (shouldResetStatus) {
            return {
              ...r,
              totalFields: assignedCount,
              status: 'pending',
            };
          }

          return {
            ...r,
            totalFields: assignedCount,
            status: r.status,
          };
        })
      );

      const finalComponents = newComponents.map(c => {
        const recipient = recipients.find(r => r.id === c.assignedRecipientId);
        if (recipient && (recipient.status === 'signed' || recipient.status === 'approved')) {
          const prevComponent = prevComponents.find(pc => pc.id === c.id);
          if (prevComponent && prevComponent.data) {
            return { ...c, data: prevComponent.data };
          }
        }
        return c;
      });

      saveState(finalComponents);
      return finalComponents;
    });
  }, [recipients, saveState, setDroppedComponents, setRecipients]);

  const handleDragStop = useCallback((e: MouseEvent | TouchEvent, item: DroppedComponent, data: DraggableData) => {
    document.body.classList.remove('dragging-no-select');
    if ((e.target as HTMLElement).closest('.delete-button-wrapper')) {
      return;
    }

    if (data.x === item.x && data.y === item.y) {
      return;
    }

    e.stopPropagation();
    if (!documentRef.current) return;

    const parentRect = documentRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;

    const fieldTopAbs = data.y + parentRect.top + scrollY;
    const fieldBottomAbs = fieldTopAbs + item.height;

    let newY = data.y;
    let newPageNumber = item.pageNumber;
    let pageRect: DOMRect | null = null;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (!pageEl) continue;

      pageRect = pageEl.getBoundingClientRect();
      const pageTopAbs = pageRect.top + scrollY;
      const pageBottomAbs = pageTopAbs + pageRect.height;

      if (fieldTopAbs >= pageTopAbs && fieldBottomAbs <= pageBottomAbs) {
        newY = data.y;
        newPageNumber = i + 1;
        break;
      }

      if (fieldBottomAbs > pageTopAbs && fieldTopAbs < pageBottomAbs) {
        const distToTop = Math.abs(fieldTopAbs - pageTopAbs);
        const distToBottom = Math.abs(fieldBottomAbs - pageBottomAbs);

        if (distToTop < distToBottom) {
          newY = pageTopAbs - parentRect.top + 1;
        } else {
          newY = pageBottomAbs - item.height - parentRect.top - 1;
        }
        newPageNumber = i + 1;
        break;
      }
    }

    setDroppedComponents(prev => {
      const newComponents = prev.map(c =>
        c.id === item.id
          ? { ...c, x: data.x, y: newY, pageNumber: newPageNumber, pageRect: pageRect }
          : c
      );
      saveState(newComponents);
      return newComponents;
    }
    );
  }, [documentRef, pageRefs, saveState, setDroppedComponents]);

  const handleResizeStop = useCallback((e: MouseEvent | TouchEvent, item: DroppedComponent, ref: { style: { width: string; height: string } }, pos: { x: number, y: number }) => {
    document.body.classList.remove('dragging-no-select');
    e.stopPropagation();
    setDroppedComponents((prev) => {
      const newComponents = prev.map((c) =>
        c.id === item.id ? { ...c, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : c
      );
      saveState(newComponents);
      return newComponents;
    });
  }, [saveState, setDroppedComponents]);

  const mouseLeaveOnDropArea = useCallback(() => {
    document.body.classList.remove('dragging-no-select');
    if (isPaletteDrag(draggingComponent)) {
      setDraggingComponent(null);
    }
  }, [draggingComponent, isPaletteDrag, setDraggingComponent]);

  const clickField = useCallback((event: ReactMouseEvent<Element>, item: DroppedComponent) => {
    event.stopPropagation();
    setDraggingComponent(item);

    if (!isSigningMode && item.fieldOwner == 'recipients') {
      return;
    }

    switch (item.component) {
      case "Image":
        setSelectedFieldForDialog(item);
        imageRef.current?.click();
        break;
      case "Stamp":
      case "Signature":
      case "Initials":
        setSelectedFieldForDialog(item);
        setCanvasFields(true);
        break;
      case "Text":
      case "Date":
        setSelectedFieldForDialog(item);
        break;
      case "Live Photo":
        setSelectedFieldForDialog(item);
        setPhotoDialog(true);
        break;
      default:
        console.warn("Unknown component clicked:", item.component);
    }
  }, [imageRef, isSigningMode, setCanvasFields, setDraggingComponent, setPhotoDialog, setSelectedFieldForDialog]);

  const onImgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await blobToURL(file);

    if (draggingComponent && 'id' in draggingComponent) {
      setDroppedComponents(prev => {
        const newComponents = prev.map(comp => {
          if (comp.id === draggingComponent.id) {
            return { ...comp, data: url };
          }
          const recipient = recipients.find(r => r.id === comp.assignedRecipientId);
          if (recipient && recipient.status === 'signed') {
            const prevComponent = prev.find(pc => pc.id === comp.id);
            if (prevComponent && prevComponent.data) {
              return { ...comp, data: prevComponent.data };
            }
          }
          return comp;
        });
        saveState(newComponents);
        return newComponents;
      });
    }

    e.target.value = '';
  }, [draggingComponent, recipients, saveState, setDroppedComponents]);

  const handleSelectField = useCallback((field: DroppedComponent) => {
    setDraggingComponent(field);
  }, [setDraggingComponent]);

  return {
    mouseDownOnField,
    mouseMoveOnDropArea,
    mouseLeaveOnDropArea,
    clickOnDropArea,
    handleDeleteField,
    handleDuplicateField,
    handleAssignRecipient,
    handleDragStop,
    handleResizeStop,
    clickField,
    onImgUpload,
    handleSelectField,
  };
};

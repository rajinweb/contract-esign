import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentDraft } from '../hooks/builder/useDocumentDraft';
import { useDocumentSave } from '../hooks/builder/useDocumentSave';

describe('preview persistence guards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not finalize or persist session data on unmount in preview mode', async () => {
    localStorage.setItem('currentDocumentId', 'doc-preview');
    localStorage.setItem('currentSessionId', 'session-preview');

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { unmount } = renderHook(() =>
      useDocumentSave({
        selectedFile: 'https://example.com/doc.pdf',
        setSelectedFile: vi.fn(),
        pdfDoc: null,
        documentName: 'Preview Doc',
        setDocumentName: vi.fn(),
        droppedComponents: [],
        recipients: [],
        currentPage: 1,
        zoom: 1,
        documentId: 'doc-preview',
        setDocumentId: vi.fn(),
        signingToken: undefined,
        isReadOnly: false,
        isLoggedIn: true,
        setShowModal: vi.fn() as unknown as React.Dispatch<React.SetStateAction<boolean>>,
        documentRef: { current: null },
        pageRefs: { current: [] },
        setDroppedComponents:
          vi.fn() as unknown as React.Dispatch<React.SetStateAction<any[]>>,
        resetHistory: vi.fn(),
        setPosition: vi.fn() as unknown as React.Dispatch<
          React.SetStateAction<{ x: number; y: number }>
        >,
        setShowDeletedDialog:
          vi.fn() as unknown as React.Dispatch<React.SetStateAction<boolean>>,
        setError: vi.fn() as unknown as React.Dispatch<React.SetStateAction<string | null>>,
        autoDate: true,
        isEditingFileName: false,
        isPreviewOnly: true,
      })
    );

    unmount();
    await Promise.resolve();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('currentSessionId')).toBe('session-preview');
    vi.unstubAllGlobals();
  });

  it('does not write draft data to sessionStorage in preview mode', () => {
    vi.useFakeTimers();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderHook(() =>
      useDocumentDraft({
        documentId: 'doc-preview',
        droppedComponents: [
          {
            id: 1,
            component: 'Text',
            x: 10,
            y: 10,
            width: 120,
            height: 40,
            data: 'Preview value',
          } as any,
        ],
        recipients: [],
        documentName: 'Preview Draft',
        selectedFile: 'https://example.com/doc.pdf',
        currentPage: 1,
        zoom: 1,
        documentRef: { current: document.createElement('div') },
        pageRefs: { current: [] },
        isPreviewOnly: true,
      })
    );

    vi.advanceTimersByTime(1500);
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

'use client';
import React, { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';

export default function useDropZone() {
  const { setSelectedFile, setDocuments, documents } = useContextStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const addDocument = useCallback(
    async (file: File) => {
      // Immediately create document on server (Version 1) and start a session
      try {
        // set a temporary selected file while upload occurs
        setSelectedFile(file);

        // Build form data similar to upload flow
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('documentName', file.name);
        formData.append('fileName', file.name);
        formData.append('isMetadataOnly', 'false');

        const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          headers: Object.keys(headers).length ? headers : undefined,
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Failed to upload document');

        const result = await res.json();
        if (result && result.success) {
          // store current ids and set selected file url
          if (result.documentId) {
            localStorage.setItem('currentDocumentId', result.documentId);
          }
          if (result.sessionId) {
            localStorage.setItem('currentSessionId', result.sessionId);
          }
          if (result.fileUrl) {
            setSelectedFile(result.fileUrl);
          }

          // Add to local documents list for UI
          const displayName = result.documentName || result.fileName || file.name;
          setDocuments(prevDocs => [
            ...prevDocs,
            {
              id: result.documentId || `${Date.now()}-${file.name}`,
              name: displayName,
              createdAt: new Date(),
              status: 'draft',
              signers: [],
              file: result.fileUrl || file,
            },
          ]);

          return result;
        }
        return null;
      } catch (err) {
        console.error('Failed to create document on upload:', err);
        return null;
      }
    },
    [setSelectedFile, setDocuments]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsLoading(true);
      const file = e.dataTransfer.files[0];
      if (file) {
        addDocument(file).then((res) => {
          const docId = res?.documentId;
          if (docId) router.push(`/builder/${docId}`);
          else router.push('/builder');
        });
      }
    },
    [addDocument, router]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsLoading(true);
        addDocument(file).then((res) => {
          const docId = res?.documentId;
          if (docId) router.push(`/builder/${docId}`);
          else router.push('/builder');
        });
      }
    },
    [addDocument, router]
  );

  const handleSampleContract = useCallback(async () => {
    setIsLoading(true);

    const pdfDoc = await PDFDocument.create();
    const pdfBytes = await pdfDoc.save();

    const file = new File(
      [new Uint8Array(pdfBytes.buffer as ArrayBuffer)],
      'sample-contract.pdf',
      { type: 'application/pdf' }
    );

    addDocument(file);
    addDocument(file).then((res) => {
      const docId = res?.documentId;
      if (docId) router.push(`/builder/${docId}`);
      else router.push('/builder');
    });
  }, [addDocument, router]);

  return { isLoading, handleDrop, handleSampleContract, handleFileInput };
}

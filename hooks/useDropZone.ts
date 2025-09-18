'use client';
import React, { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';

export default function useDropZone() {
  const { setSelectedFile, setDocuments } = useContextStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const addDocument = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setDocuments(prevDocs => [
        ...prevDocs,
        {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          createdAt: new Date(),
          status: 'draft',
          signers: [],
          file,
        },
      ]);
    },
    [setSelectedFile, setDocuments]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsLoading(true);
      const file = e.dataTransfer.files[0];
      if (file) {
        addDocument(file);
        router.push('/builder');
      }
    },
    [addDocument, router]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsLoading(true);
        addDocument(file);
        router.push('/builder');
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
    router.push('/builder');
  }, [addDocument, router]);

  return { isLoading, handleDrop, handleSampleContract, handleFileInput };
}

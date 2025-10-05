'use client';
import React, { useEffect } from 'react';
import DocumentEditor from '@/components/builder/DocumentEditor';
import useContextStore from '@/hooks/useContextStore';

interface Props {
  params: any;
}

export default function BuilderDoc({ params }: Props) {
  const { setSelectedFile } = useContextStore();

  const [initialData, setInitialData] = React.useState<{
    fileUrl?: string | null;
    fileName?: string | null;
    fields?: any[] | null;
    recipients?: any[] | null;
  }>({});

  useEffect(() => {
    (async () => {
      try {
        const p = await params; // supports Promise or object
        const docId = p?.documentId;
        if (typeof window !== 'undefined' && docId) {
          localStorage.setItem('currentDocumentId', docId);

          // Fetch document metadata and pass it to the editor as props
          try {
            const token = localStorage.getItem('AccessToken');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/documents/load?id=${encodeURIComponent(docId)}`, {
              headers: Object.keys(headers).length ? headers : undefined,
              credentials: 'include',
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.document) {
                const filePath = data.document.filePath;
                const fileUrl = filePath ? `/api/documents/file?path=${encodeURIComponent(filePath)}` : null;
                if (fileUrl) setSelectedFile(fileUrl);
                setInitialData({
                  fileUrl,
                  fileName: data.document.fileName || data.document.documentName || null,
                  fields: data.document.fields || [],
                  recipients: data.document.recipients || [],
                });
              }
            }
          } catch (err) {
            console.error('Failed to prefetch document metadata:', err);
          }
        }
      } catch (err) {
        const docId = (params as any)?.documentId;
        if (typeof window !== 'undefined' && docId) {
          localStorage.setItem('currentDocumentId', docId);
        }
      }
    })();
  }, [params, setSelectedFile]);

  return (
    (() => {
      // params may be a Promise in this Next.js version; use React.use to unwrap
      const resolved = (React as any).use ? (React as any).use(params) : params;
      const docId = resolved?.documentId || (params as any)?.documentId || '';
      return (
        <DocumentEditor
          documentId={String(docId)}
          initialFileUrl={initialData.fileUrl || null}
          initialFileName={initialData.fileName || null}
          initialFields={initialData.fields || null}
          initialRecipients={initialData.recipients || null}
        />
      );
    })()
  );
}

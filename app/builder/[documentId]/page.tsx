import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import DocumentEditor from "@/components/builder/DocumentEditor";

interface Props {
  params: Promise<{ documentId: string }>;
}

async function fetchDocumentData(documentId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) return null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");

    const url = `${baseUrl}/api/documents/load?id=${encodeURIComponent(documentId)}`;
    console.log("Fetching document from:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    console.log("Fetch status:", res.status);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.success && data.document) {
      const fileUrl = `${baseUrl}/api/documents/file?documentId=${encodeURIComponent(documentId)}`;

      return {
        fileUrl,
        documentName: data.document.documentName || null,
        fields: data.document.fields || [],
        recipients: data.document.recipients || [],
      };
    }

    return null;
  } catch (err) {
    console.error("Error fetching document:", err);
    return null;
  }
}

export default async function BuilderDoc({ params }: Props) {
  const { documentId } = await params; 
  console.log("Resolved documentId:", documentId);

  const initialData = await fetchDocumentData(documentId);

  if (!initialData) {
    notFound();
  }

  return (
    <DocumentEditor
      documentId={documentId}
      initialFileUrl={initialData.fileUrl}
      initialDocumentName={initialData.documentName}
      initialFields={initialData.fields}
      initialRecipients={initialData.recipients}
    />
  );
}

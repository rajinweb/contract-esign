import { cookies } from "next/headers";
import { notFound } from "next/navigation";

// Assuming DocumentEditor can be adapted to handle templates, or we create a new TemplateEditor
// For now, let's adapt DocumentEditor and rename it for clarity or create a new one later.
// Let's assume a generic 'TemplateEditor' component that handles fields and PDF.
import TemplateEditor from "@/components/builder/DocumentEditor"; // Using DocumentEditor for now, will need adaptation

interface Props {
  params: Promise<{ templateId: string }>;
}

async function fetchTemplateData(templateId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) return null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

    const url = `${baseUrl}/api/templates/load?id=${encodeURIComponent(templateId)}`;
    console.log("Fetching template from:", url);

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

    if (data.success && data.template) {
      const fileUrl = `${baseUrl}/api/templates/${encodeURIComponent(templateId)}`;

      return {
        fileUrl,
        templateName: data.template.name || null,
        fields: data.template.fields || [],
        recipients: data.template.defaultSigners || [], // Templates might have default signers
      };
    }

    return null;
  } catch (err) {
    console.error("Error fetching template:", err);
    return null;
  }
}

export default async function TemplateBuilderPage({ params }: Props) {
  const { templateId } = await params;
  console.log("Resolved templateId:", templateId);

  const initialData = await fetchTemplateData(templateId);

  if (!initialData) {
    notFound();
  }

  // Pass template-specific props to the editor.
  // The DocumentEditor component might need to be made more generic or a new TemplateEditor created.
  return (
    <TemplateEditor
      documentId={templateId} // Using documentId prop for templateId for now, assuming editor can handle it
      initialFileUrl={initialData.fileUrl}
      initialDocumentName={initialData.templateName} // Using templateName as documentName
      initialFields={initialData.fields}
      initialRecipients={initialData.recipients}
      isTemplateEditor={true} // New prop to indicate it's editing a template
    />
  );
}

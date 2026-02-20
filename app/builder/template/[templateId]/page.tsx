import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Recipient } from "@/types/types";
import { buildTemplateRecipients } from "@/lib/template-recipients";

// Assuming DocumentEditor can be adapted to handle templates, or we create a new TemplateEditor
// For now, let's adapt DocumentEditor and rename it for clarity or create a new one later.
// Let's assume a generic 'TemplateEditor' component that handles fields and PDF.
import TemplateEditor from "@/components/builder/DocumentEditor"; // Using DocumentEditor for now, will need adaptation

interface Props {
  params: Promise<{ templateId: string }>;
}

function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

async function fetchTemplateData(templateId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return { data: null, status: null as number | null };
  }

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

    if (!res.ok) {
      return { data: null, status: res.status };
    }
    const data = await res.json();

    if (data.success && data.template) {
      const fileUrl = `${baseUrl}/api/templates/${encodeURIComponent(templateId)}`;
      const fields = data.template.fields || [];
      const recipients = buildTemplateRecipients(
        templateId,
        data.template.defaultSigners || [],
        fields
      ) as Recipient[];

      return {
        data: {
          fileUrl,
          templateName: data.template.name || null,
          fields,
          recipients,
        },
        status: res.status,
      };
    }

    return { data: null, status: res.status };
  } catch (err) {
    console.error("Error fetching template:", err);
    return { data: null, status: null as number | null };
  }
}

export default async function TemplateBuilderPage({ params }: Props) {
  const { templateId } = await params;
  if (!isValidObjectId(templateId)) {
    notFound();
  }
  console.log("Resolved templateId:", templateId);

  const { data: initialData, status } = await fetchTemplateData(templateId);

  if (!initialData) {
    if (status === 404) {
      notFound();
    }
    if (status === 403) {
      redirect('/templates?view=my');
    }
    // Fallback to client-side loading when SSR fetch cannot resolve auth/context.
    return <TemplateEditor documentId={templateId} isTemplateEditor />;
  }

  // Pass template-specific props to the editor.
  // The DocumentEditor component might need to be made more generic or a new TemplateEditor created.
  return (
    <TemplateEditor
      documentId={templateId} // Using documentId prop for templateId for now, assuming editor can handle it
      initialFileUrl={initialData.fileUrl}
      initialResourceName={initialData.templateName} // Using templateName as documentName
      initialFields={initialData.fields}
      initialRecipients={initialData.recipients}
      isTemplateEditor={true} // New prop to indicate it's editing a template
    />
  );
}

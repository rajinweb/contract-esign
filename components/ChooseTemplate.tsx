import React, { useEffect, useState } from "react";
import Image from "next/image";
import PdfThumbnail from '@/components/PdfThumbnails';
import { ArrowBigRightDash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTemplates } from "@/hooks/useTemplates";
import toast from "react-hot-toast";
import { Button } from "./Button";

interface Template {
  _id: string;
  name: string;
  category: string;
  description?: string;
  pageCount?: number;
  thumbnailUrl?: string;
  templateFileUrl?: string;
  isSystemTemplate: boolean;
}

const ChooseTemplate = () => {
  const router = useRouter();
  const { createDocumentFromTemplate } = useTemplates();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDoc, setCreatingDoc] = useState<string | null>(null);
  const thumbnailCSS = "w-32 h-40 rounded-xl border-2 border-gray-100 p-2 cursor-pointer hover:border-blue-500 "; 
  
  useEffect(() => {
    const fetchSystemTemplates = async () => {
      try {
        const response = await fetch('/api/templates/list?isSystem=true&limit=5');
        if (response.ok) {
          const data = await response.json();
          console.log('ChooseTemplate: fetched templates', data.templates);
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSystemTemplates();
  }, []);

  const handleTemplateClick = async (template: Template) => {
    // Create document from template for both logged-in users and guests
    setCreatingDoc(template._id);
    try {
      const result = await createDocumentFromTemplate(template._id, `${template.name} - ${new Date().toLocaleDateString()}`);
      if (result) {
        toast.success('Document created from template');
        const safeGuestId = typeof result.guestId === 'string' && result.guestId.startsWith('guest_')
          ? result.guestId
          : null;
        const builderUrl = safeGuestId
          ? `/builder/${result.documentId}?guestId=${encodeURIComponent(safeGuestId)}`
          : `/builder/${result.documentId}`;
        router.push(builderUrl);
      } else {
        toast.error('Failed to create document from template');
      }
    } catch (error) {
      console.error('Error using template:', error);
      toast.error('Failed to create document from template');
    } finally {
      setCreatingDoc(null);
    }
  };

  return (
    <section className="container flex gap-8 max-w-7xl mx-auto px-10 flex-col">
      <h2 className="pt-5">Find your perfect template. Set the tone and create something epic!</h2>
      <div className="flex items-center justify-between w-full">
       <div className="w-40 flex items-center gap-2"> <Image src={'/images/template-select.png'} width={140} height={140} quality={100} alt="Placeholder"  /> <ArrowBigRightDash size={30} color="rgb(21 133 252)" /></div>
        <div className="flex space-x-4">
          {loading ? (
            // Skeleton loader
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className={`${thumbnailCSS} bg-gray-200 animate-pulse`}>
                <div className="w-full h-full rounded-md" />
              </div>
            ))
          ) : templates.length > 0 ? (
            templates.map((template) => (
              <div
                key={template._id}
                onClick={() => handleTemplateClick(template)}
                className={`${thumbnailCSS} ${creatingDoc === template._id ? 'cursor-wait' : ''}`}
                title={template.name}
              >
                {creatingDoc === template._id ? (
                  <div className="text-gray-500">Creating...</div>
                ) : template.templateFileUrl ? (
                  <PdfThumbnail fileUrl={template.templateFileUrl} width={120} height={160} className="h-full object-cover" />
                ) : template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="h-full"
                    width={120} height={160} quality={100}   
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl mb-1">📄</div>
                    <div className="text-xs text-gray-600 font-medium text-center line-clamp-2">{template.name}</div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-500">No templates available</div>
          )}
        </div>
        <Button 
          onClick={() => router.push('/templates')}
          className="w-60"
          label="Choose Template"
          />
      </div>
    </section>
  );
};

export default ChooseTemplate;

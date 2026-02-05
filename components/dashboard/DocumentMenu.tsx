import useContextStore from "@/hooks/useContextStore";
import useDropZone from "@/hooks/useDropZone";
import { Template, useTemplates } from "@/hooks/useTemplates";
import { SecondarySidebarType } from "@/types/types";
import { ChevronDown, FileStack, Layers, Plus, Trash2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DocumentsMenu = ({
  activeSecondarybar,
  secondaryActive,
  templates,
  fetchTemplates,
}: {
  activeSecondarybar: SecondarySidebarType;
  secondaryActive: (s: SecondarySidebarType) => void;
  templates: Template[];
  fetchTemplates: (category?: string, search?: string, isActive?:boolean) => Promise<void>;
}) => {
  const { documents, trashedTemplatesCount } = useContextStore();
  const { fetchTrashedTemplatesCount } = useTemplates();
  const [myTemplatesCount, setMyTemplatesCount] = useState(0);
  const [systemTemplatesCount, setSystemTemplatesCount] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const fetchedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTemplates();
    }
    fetchTrashedTemplatesCount();
  }, [fetchTemplates, fetchTrashedTemplatesCount]);

  useEffect(() => {
    if (templates) {
      const myTemplates = templates.filter((t) => !t.isSystemTemplate).length;
      setMyTemplatesCount(myTemplates - trashedTemplatesCount );
      const systemTemplates = templates.filter((t) => t.isSystemTemplate).length;
      setSystemTemplatesCount(systemTemplates);
    }
  }, [templates, trashedTemplatesCount]);

  const searchParams = useSearchParams();
  const view = searchParams?.get('view');

  useEffect(() => {
    if (view === 'my' || view === 'system' || view === 'all') {
      secondaryActive('my-templates');
      setTemplatesOpen(true);
    }
  }, [view, secondaryActive]);

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Documents</h2>
      {/* Dropdown */}
      <NewDocMenu secondaryActive={secondaryActive} />
      <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs font-medium uppercase">
        Quick Access
      </div>
      <nav className="mt-3 space-y-2 text-sm">
        <button onClick={() => {
          secondaryActive('dash-documents');
          router.push('/dashboard');
        }}
          className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-slate-100 border-l-4 ${activeSecondarybar === 'dash-documents'
              ? 'bg-slate-100 text-slate-800 border-blue-600'
              : 'hover:bg-slate-50 border-transparent'
            }`}
        >
          <div className="flex items-center gap-3">
            <FileStack className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-800">Documents</span>
          </div>
          <div className="text-slate-500">{documents.filter(doc => !doc.deletedAt).length}</div>
        </button>

        <div>
          <button
            onClick={() => setTemplatesOpen(!templatesOpen)}
            className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-slate-100 border-l-4 ${activeSecondarybar === 'my-templates'
                ? 'bg-slate-100 text-slate-800 border-blue-600'
                : 'hover:bg-slate-50 border-transparent'
              }`}
          >
            <div className="flex items-center gap-3 text-slate-700">
              <Layers className="w-5 h-5 text-slate-600" />
              <span>Templates</span>
            </div>
            <div className="text-slate-500">{myTemplatesCount + systemTemplatesCount}</div>
          </button>
          {templatesOpen && (
            <div className='pl-10 py-2 w-full space-y-1'>
              <button
                onClick={() => {
                  secondaryActive('my-templates');
                  router.push('/dashboard?view=my');
                }}
                className={`w-full flex justify-between items-center px-2 py-1 rounded-md text-xs ${view === 'my' ? 'bg-slate-100 font-semibold text-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>▸ My Templates</span> {myTemplatesCount}
              </button>
              <button
                onClick={() => {
                  secondaryActive('my-templates');
                  router.push('/dashboard?view=system');
                }}
                className={`w-full flex justify-between items-center px-2 py-1 rounded-md text-xs ${view === 'system' ? 'bg-slate-100 font-semibold text-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>▸ System Templates</span> {systemTemplatesCount}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => secondaryActive('trash')}
          className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-slate-100 border-l-4 ${activeSecondarybar === 'trash'
              ? 'bg-slate-100 text-slate-800 border-blue-600'
              : 'hover:bg-slate-50 border-transparent'
            }`}
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Trash2 className="w-5 h-5 text-slate-600" />
            <span>Trash </span>
          </div>
          <div className="text-slate-500">{documents.filter(doc => doc.deletedAt).length + trashedTemplatesCount}</div>
        </button>
      </nav>
    </>
  );
};
export default DocumentsMenu;


export const NewDocMenu = ({
  secondaryActive
}: {
  secondaryActive: (s: SecondarySidebarType) => void;
}) => {
  const { handleSampleContract, handleFileInput } = useDropZone();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative group">
      <div className="flex">
        <button className="w-full primary-button rounded-tr-none rounded-br-none" onClick={handleSampleContract}>
          <span className='flex gap-1 justify-center'>
            <Plus />
            New Document
          </span>
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="primary-button rounded-tl-none rounded-bl-none px-2.5  border border-r border-blue-800"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute left-0 mt-1 w-[250] bg-white border border-gray-200 rounded-md shadow-lg z-30 hidden group-focus-within:block divide-y " tabIndex={-1}>
        <label className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 h-14">
          <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.doc,.docx,.txt" />
          <div className="flex gap-2 w-[250px]">
            <div className='w-10 flex items-center'>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="30" height="30">
                <path fill="#faa85f" d="M38.125 31.25a8.75 8.75 0 0 1-8.75 8.75 8.75 8.75 0 0 1-8.75-8.75 8.75 8.75 0 0 1 17.5 0" />
                <path fill="#fff" d="m29.375 26.25-3.75 5h2.5v5h2.5v-5h2.5Z" />
                <path fill="#00384e" d="M20.027 37.5H4.375v-35h15v10h10V20c.86 0 1.695.106 2.5.29v-9.557L21.142 0H1.875v40H22.32a11.4 11.4 0 0 1-2.293-2.5m1.848-33.233L27.607 10h-5.732z" />
                <path fill="#72c6ef" d="M18.125 31.25c0-5.342 3.747-9.818 8.75-10.96V12.5h-7.5V5h-12.5v30h11.906a11.2 11.2 0 0 1-.656-3.75" />
                <path fill="#00384d" d="M10.625 18.75h12.5v2.5h-12.5zm10.389 5H10.625v2.5h8.687a11.2 11.2 0 0 1 1.702-2.5m-10.389 5v2.5h7.5c0-.86.106-1.695.29-2.5z" />
              </svg>
            </div>
            <div className='text-left'>
              <div className="font-bold text-gray-800">Document</div>
              <div className="text-gray-500 text-xs">Upload a file to be signed</div>
            </div>
          </div>
        </label>
        <button className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 h-14" onClick={() => secondaryActive('my-templates')}>
          <div className="flex gap-2 w-[250px]">
            <div className='w-10 flex items-center'>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="30" height="30">
                <path fill="#faa85f" d="M38.125 31.25a8.75 8.75 0 0 1-8.75 8.75 8.75 8.75 0 0 1-8.75-8.75 8.75 8.75 0 0 1 17.5 0" />
                <path fill="#fff" d="M33.517 28.321c-1.144-1.095-2.999-1.095-4.143 0-1.144-1.095-2.999-1.095-4.143 0s-1.144 2.87 0 3.965l4.144 3.964 4.143-3.965a2.72 2.72 0 0 0 0-3.964" />
                <path fill="#72c6ef" d="M18.125 31.25c0-5.343 3.748-9.819 8.75-10.96V12.5h-7.5V5h-12.5v30h11.906a11.2 11.2 0 0 1-.656-3.75" />
                <path fill="#00384d" d="M10.625 18.75h12.5v2.5h-12.5z" />
                <path fill="#00384e" d="M20.027 37.5H4.375v-35h15v10h10V20c.86 0 1.695.106 2.5.29v-9.558L21.143 0H1.875v40H22.32a11.3 11.3 0 0 1-2.292-2.5m1.847-33.232L27.607 10h-5.732z" />
                <path fill="#00384d" d="M21.014 23.75H10.625v2.5h8.688a11.2 11.2 0 0 1 1.701-2.5m-10.389 5v2.5h7.5c0-.86.106-1.695.29-2.5z" />
              </svg>
            </div>
            <div className='text-left'>
              <div className="font-bold text-gray-800">Template</div>
              <div className="text-gray-500 text-xs">Ready-made pre-built file</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )

}

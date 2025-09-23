import React, { useState } from 'react';
import {
  ChevronDown,
  FileText,
  User,
  BarChart3,
  Code,
  Table,
  Users,
  UserPlus,
  Grid,
  Archive,
  Trash2,
  FolderPlus,
  Layers,
  Plus,
  ChevronRight,
} from 'lucide-react';
import useDropZone from '@/hooks/useDropZone'
import useContextStore from '@/hooks/useContextStore';
import BulkImportModal from '../contacts/BulkImportModal';

type SidebarType = 'documents' | 'contacts' | 'reports';
export const PrimarySidebar = ({
  active,
  setActive,
  }: {
    active: SidebarType;
    setActive: (s: SidebarType) => void;
  }) => (
  <aside className="w-14 border-r border-gray-200 flex flex-col justify-between">
    <div className="pt-4 flex flex-col items-center gap-3">
      {/* Document  click */}
      <button
        onClick={() => setActive('documents')}
        className={`w-10 h-10 flex items-center justify-center rounded-md ${
          active === 'documents'
            ? 'bg-slate-100 text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="Documents"
      >
        <FileText className="w-5 h-5" />
      </button>
      {/* Contact  click */}
      <button
        onClick={() => setActive('contacts')}
        className={`w-10 h-10 flex items-center justify-center rounded-md ${
          active === 'contacts'
            ? 'bg-slate-100 text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="Contacts">
        <User className="w-5 h-5" />
      </button>
      {/* Report  click */}
      <div className="relative">
        <button
          onClick={() => setActive('reports')}
          className={`w-10 h-10 flex items-center justify-center rounded-md ${
            active === 'reports'
              ? 'bg-slate-100 text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          title="Reports" >
          <BarChart3 className="w-5 h-5" />
        </button>
        <span className="absolute -right-1 -top-1 text-[10px] font-semibold bg-emerald-400 text-white px-1 rounded">
          NEW
        </span>
      </div>
    </div>

    <div className="pb-4 flex flex-col items-center gap-3">
      <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700">
        <Code className="w-5 h-5" />
      </button>
      <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700">
        <Table className="w-5 h-5" />
      </button>
      <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700">
        <Users className="w-5 h-5" />
      </button>
      <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700">
        <Grid className="w-5 h-5" />
      </button>
    </div>
  </aside>
);

export const SecondarySidebar = ({ active }: { active: SidebarType }) => (
  <aside className="w-72">
    <div className="p-5 h-full Xoverflow-auto">
      {active === 'documents' && <DocumentsMenu />}
      {active === 'contacts' && <ContactsSidebar />}
      {active === 'reports' && <ReportsSidebar />}
    </div>
  </aside>
);

export const DocumentsMenu = () => {

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Documents</h2>     
      {/* Dropdown */}
      <NewDocMenu/>
      <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs font-medium uppercase">
        Quick Access
      </div>
      <nav className="mt-3 space-y-2 text-sm">
        <a href="#"
          className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2.5 hover:bg-slate-100 border-l-4 border-blue-600"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-800">Documents</span>
          </div>
          <div className="text-slate-500">1</div>
        </a>
        
        <a
          href="#"
          className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Archive className="w-5 h-5 text-slate-600" />
            <span>Archive</span>
          </div>
          <div className="text-slate-500">0</div>
        </a>

        <a
          href="#"
          className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Layers className="w-5 h-5 text-slate-600" />
            <span>Templates</span>
          </div>
          <div className="text-slate-500">0</div>
        </a>

        <a
          href="#"
          className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Trash2 className="w-5 h-5 text-slate-600" />
            <span>Trash</span>
          </div>
          <div className="text-slate-500">0</div>
        </a>
      </nav>

      <div className="mt-6 border-t border-gray-100 pt-4 text-sm">
        <div className="uppercase text-xs text-slate-400 font-semibold tracking-wide">
          Shared Team Folders
        </div>

        <button className="mt-3 w-full text-left flex items-center gap-3 px-1.5 py-2 rounded hover:bg-slate-50">
          <Layers className="w-5 h-5 text-slate-600" />
          <span className="text-slate-700">My first team</span>
        </button>

        <button className="mt-3 inline-flex items-center gap-2 text-blue-600 font-medium">
          <FolderPlus className="w-4 h-4" />
          Create Team
        </button>
      </div>
    </>
  );
};

export function ContactsSidebar() {
  const [open, setOpen] = useState(false);
  const {setShowModal} = useContextStore();
  const [showBulkImport, setShowBulkImport] = useState(false);

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Contacts</h2>
      {/* Create Contact Button with Dropdown */}
      <div className="relative">
        <div className="flex">
            <button 
              onClick={() => setShowModal(true)}
              className="w-full primary-button rounded-tr-none rounded-br-none"
            >
            <span className='flex gap-1 justify-center'>
              <Plus/>
              Create Contact
            </span>
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="primary-button rounded-tl-none rounded-bl-none px-2.5  border border-r border-blue-800"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg">
            <button 
              onClick={() => {
                setShowBulkImport(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <UserPlus className="w-4 h-4" />
              Import in Bulk
            </button>
          </div>
        )}
      </div>

      {/* Side Nav */}
      <nav className="mt-6 space-y-2 text-sm">
        <button 
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 text-slate-800"
        >
          <Users className="w-4 h-4" />
          All Contacts
        </button>
        {/*
        <div className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">
          <span className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Owned by Me
          </span>
          <span className="text-slate-500">1</span>
        </div>

        <div className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Shared with Me
          </span>
          <span className="text-slate-500">0</span>
        </div>
        */}
      </nav>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={() => {
            setShowBulkImport(false);
            // The parent component will handle the refresh
          }}
        />
      )}
    </>
  );
}

export function ReportsSidebar() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Reports</h2>

      {/* Dashboards */}
      <div className="uppercase text-xs text-slate-400 font-semibold tracking-wide mb-2">
        Dashboards
      </div>
      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 text-slate-800">
        <BarChart3 className="w-4 h-4" />
        My analytics
      </button>

      {/* Reports Section */}
      <div className="mt-1">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">
          <FileText className="w-4 h-4" />
          All Reports
        </button>

        {/* By Documents */}
        <button
          onClick={() =>
            setOpenSection(openSection === 'documents' ? null : 'documents')
          }
          className="w-full flex justify-between items-center px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 text-sm"
        >
          <span>▸ By Documents</span>
        </button>
        {openSection === 'documents' && (
          <div className="ml-6 mt-1 text-xs text-slate-600 space-y-1">
            <div>Document Report 1</div>
            <div>Document Report 2</div>
          </div>
        )}

        {/* By Templates */}
        <button
          onClick={() =>
            setOpenSection(openSection === 'templates' ? null : 'templates')
          }
          className="w-full flex justify-between items-center px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 text-sm"
        >
          <span>▸ By Templates</span>
        </button>
        {openSection === 'templates' && (
          <div className="ml-6 mt-1 text-xs text-slate-600 space-y-1">
            <div>Template Report A</div>
            <div>Template Report B</div>
          </div>
        )}

        {/* By Recipients */}
        <div className="items-center justify-between px-3 py-2 text-slate-400 text-sm cursor-not-allowed">
          <span>▸ By Recipients</span>
          <div className="bg-amber-200 flex-1 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">
            COMING SOON
          </div>
        </div>
      </div>
    </>
  );
}


const NewDocMenu=()=>{
  const {handleSampleContract, handleFileInput}=useDropZone();
  const [open, setOpen] = useState(false);

  return (
        <div className="relative group">
        <div className="flex">
          <button className="w-full primary-button rounded-tr-none rounded-br-none"  onClick={handleSampleContract}>
            <span className='flex gap-1 justify-center'>
              <Plus/>
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

    <div className="absolute left-0 mt-1 w-[300] bg-white border border-gray-200 rounded-md shadow-lg z-30 hidden group-focus-within:block " tabIndex={-1}>          
      <label className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
        <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.doc,.docx,.txt" />
          <div className="flex gap-2 w-[250px]">
            <div className='w-10'>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
              <path fill="#faa85f" d="M38.125 31.25a8.75 8.75 0 0 1-8.75 8.75 8.75 8.75 0 0 1-8.75-8.75 8.75 8.75 0 0 1 17.5 0"/>
              <path fill="#fff" d="m29.375 26.25-3.75 5h2.5v5h2.5v-5h2.5Z"/>
              <path fill="#00384e" d="M20.027 37.5H4.375v-35h15v10h10V20c.86 0 1.695.106 2.5.29v-9.557L21.142 0H1.875v40H22.32a11.4 11.4 0 0 1-2.293-2.5m1.848-33.233L27.607 10h-5.732z"/>
              <path fill="#72c6ef" d="M18.125 31.25c0-5.342 3.747-9.818 8.75-10.96V12.5h-7.5V5h-12.5v30h11.906a11.2 11.2 0 0 1-.656-3.75"/>
              <path fill="#00384d" d="M10.625 18.75h12.5v2.5h-12.5zm10.389 5H10.625v2.5h8.687a11.2 11.2 0 0 1 1.702-2.5m-10.389 5v2.5h7.5c0-.86.106-1.695.29-2.5z"/>
            </svg>
            </div>
            <div className='text-left'>
              <div className="font-bold text-gray-800">Document</div>
              <div className="text-gray-500">Upload a file to be signed</div>
            </div>
        </div>
        <ChevronRight className="ml-4 w-6 h-6 text-gray-400"/>
      </label>
      <button className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
        <div className="flex gap-2 w-[250px]">
          <div className='w-10'>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
              <path fill="#faa85f" d="M38.125 31.25a8.75 8.75 0 0 1-8.75 8.75 8.75 8.75 0 0 1-8.75-8.75 8.75 8.75 0 0 1 17.5 0"/>
              <path fill="#fff" d="M33.517 28.321c-1.144-1.095-2.999-1.095-4.143 0-1.144-1.095-2.999-1.095-4.143 0s-1.144 2.87 0 3.965l4.144 3.964 4.143-3.965a2.72 2.72 0 0 0 0-3.964"/>
              <path fill="#72c6ef" d="M18.125 31.25c0-5.343 3.748-9.819 8.75-10.96V12.5h-7.5V5h-12.5v30h11.906a11.2 11.2 0 0 1-.656-3.75"/>
              <path fill="#00384d" d="M10.625 18.75h12.5v2.5h-12.5z"/>
              <path fill="#00384e" d="M20.027 37.5H4.375v-35h15v10h10V20c.86 0 1.695.106 2.5.29v-9.558L21.143 0H1.875v40H22.32a11.3 11.3 0 0 1-2.292-2.5m1.847-33.232L27.607 10h-5.732z"/>
              <path fill="#00384d" d="M21.014 23.75H10.625v2.5h8.688a11.2 11.2 0 0 1 1.701-2.5m-10.389 5v2.5h7.5c0-.86.106-1.695.29-2.5z"/>
            </svg>
            </div>
            <div className='text-left'>
              <div className="font-bold text-gray-800">Template</div>
              <div className="text-gray-500">Ready-made pre-built file</div>
            </div>
        </div>
        <ChevronRight className="ml-4 w-6 h-6 text-gray-400"/>
      </button>
    </div>
     </div>
  )

}
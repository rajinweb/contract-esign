'use client';
import React, {useEffect, useState } from 'react';
import DocumentList from '@/components/DocumentList';
import UploadZone from '@/components/UploadZone';
import {PrimarySidebar, SecondarySidebar} from '@/components/dashboard/Sidebar';
import { Doc } from '@/types/types';
import useContextStore from '@/hooks/useContextStore';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { ChevronDown } from 'lucide-react';
import SearchInput from '@/components/dashboard/DocSearch';
import Contacts from '@/components/contacts/Contacts';
function Dashboard() {
  const { documents, setDocuments } = useContextStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSidebar, setActiveSidebar] = useState<'documents' | 'contacts' | 'reports'>('documents');
  useEffect(() => {
    localStorage.removeItem('currentDocumentId'); // remove stored doc id   
    localStorage.removeItem('currentSessionId'); // remove currentFileSessionId    
    async function fetchDocs() {
      try {
        const res = await fetch('/api/documents/list', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('AccessToken') || ''}`,
          },
        });

        if (!res.ok) {
          console.error('Failed to fetch documents:', res.status);
          setDocuments([]);
          return;
        }

        let data: { success: boolean; documents: unknown[] } = { success: false, documents: [] };
        try {
          data = await res.json();
        } catch (err) {
          console.error('Failed to parse JSON:', err);
          setDocuments([]);
          return;
        }

        if (!data.success || !Array.isArray(data.documents)) {
          console.error('Invalid response format');
          setDocuments([]);
          return;
        }

        const mappedDocs: Doc[] = (data.documents as Record<string, unknown>[]).map((doc) => ({
          id: String(doc.id || ''),
          name: String(doc.name || doc.originalFileName || 'Untitled'),
          folder: '',
          status: String(doc.status || 'saved') as Doc['status'],
          createdAt: new Date(doc.createdAt as string),
          file: undefined,
          url: `/api/documents/get?folder=${doc.userId || ''}&name=${doc.originalFileName}`,
          documentId: String(doc.id || ''),
        }));

        setDocuments(mappedDocs);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setDocuments([]);
      }
    }
    fetchDocs();
  }, [setDocuments]);
  return (
    <div className="flex h-screen">
       <div className="min-h-screen flex flex-col w-[300px] bg-white border-r border-gray-200">
          <header className="border-b border-gray-200 px-5 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-lg">
                S
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-slate-900">
                  rajuxdesigns@gmail.com
                </div>
                <div className="text-xs text-slate-500">Personal Account</div>
              </div>
            </div>
        
            <button
              className="text-slate-400 hover:text-slate-600"
              aria-label="account menu"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </header>
        <main className="flex flex-1">
          <PrimarySidebar active={activeSidebar} setActive={setActiveSidebar} />
          <SecondarySidebar active={activeSidebar}/>
        </main>
      </div>
  
      <div className="flex-1">

        <header className="flex items-center justify-end  border-b  gap-4 px-6  bg-white h-16">
          <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} placeholder={activeSidebar === 'contacts' ? 'Search contacts...' : 'Search documents and forms'}  />
          <DashboardHeader/>
        </header>

        {documents.length === 0 && activeSidebar === 'documents' ? (
          <UploadZone />
        ) : (

          <div className='p-4 overflow-auto h-[calc(100vh-65px)] bg-gray-100'>
          
            {activeSidebar === 'documents' && (
            <DocumentList searchQuery={searchQuery}/>
            )
            }
            {activeSidebar === 'contacts' && <Contacts searchQuery={searchQuery}/>}
            {activeSidebar === 'reports' &&  <>Report page</>}    
          </div>

        )}
      </div>
    </div>
  );
}

export default Dashboard;

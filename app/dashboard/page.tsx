'use client';
import React, { useState } from 'react';
import DocumentList from '@/components/DocumentList';
import UploadZone from '@/components/UploadZone';
import {PrimarySidebar, SecondarySidebar} from '@/components/dashboard/Sidebar';
import { Doc } from '@/types/types';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Filters from '@/components/dashboard/Filters';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { ChevronDown } from 'lucide-react';
import SearchInput from '@/components/dashboard/DocSearch';
import Contacts from '@/components/contacts/Contacts';

function Dashboard() {
  const { setSelectedFile, documents, setDocuments } = useContextStore();

  // 🔑 States for filters & view
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [view, setView] = useState<'list' | 'grid'>('list');

  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleFileSelect = (file: File) => {
    const exists = documents.some((doc) => doc.name === file.name);
    if (exists) {
      setSelectedFile(file);
      return;
    }
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'draft',
      createdAt: new Date(),
      signers: [],
      file,
    } as Doc;
    setDocuments([newDoc, ...documents]);
    setSelectedFile(file);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesStatus = selectedStatus === "all" || !selectedStatus || doc.status === selectedStatus;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const [activeSidebar, setActiveSidebar] = useState<'documents' | 'contacts' | 'reports'>('documents');

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
          <div className='p-4'>
          
            {activeSidebar === 'documents' && (
            <>              
              <Filters
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                selectedOwner={selectedOwner}
                setSelectedOwner={setSelectedOwner}
                sortBy={sortBy}
                setSortBy={setSortBy}
                view={view}
                setView={setView}
              />
              <DocumentList
                documents={filteredDocuments}
                onDocumentSelect={(doc) => {
                  if (doc.file && doc.file instanceof File) {
                    handleFileSelect(doc.file);
                    router.push('/builder');
                  } else {
                    toast('No file found for this document.');
                  }
                }}
              />
            </>
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

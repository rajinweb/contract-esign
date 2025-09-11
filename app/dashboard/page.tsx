'use client';
import React, { useState } from 'react';
import DocumentList from '@/components/DocumentList';
import UploadZone from '@/components/UploadZone';
import Sidebar from '@/components/Sidebar';
import { Doc } from '@/types/types';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Filters from '@/components/dashboard/Filters';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1">
        <DashboardHeader
          docSearchQuery={searchQuery}
          setDocSearchQuery={setSearchQuery}
        />
        {documents.length === 0 ? (
          <UploadZone />
        ) : (
          <div className='p-4'>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

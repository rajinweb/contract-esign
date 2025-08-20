'use client';
import React, {useState } from 'react';
import { Search } from 'lucide-react';
import DocumentList from '@/components/DocumentList';
import UploadZone from '@/components/UploadZone';
import Sidebar from '@/components/Sidebar';
import {Doc} from '@/types/types';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';

function Dashboard() {
  const {setSelectedFile, documents, setDocuments } = useContextStore();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router=useRouter();

  const handleFileSelect = (file: File) => {
      const exists = documents.some(doc => doc.name === file.name);
      if (exists) {
        setSelectedFile(file);
        return; 
      }
      const newDoc = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        status: 'to_sign',
        createdAt: new Date(),
        signers: [],
        file, 
      } as Doc;
      setDocuments([newDoc, ...documents]);
      setSelectedFile(file);
    };

  const filteredDocuments = documents.filter((doc) => {
    const matchesStatus = !selectedStatus || doc.status === selectedStatus;
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });


  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
      <h1>Dashboard</h1>
      <div className="flex space-x-8">
          <Sidebar
            selectedStatus={selectedStatus}
            onStatusSelect={setSelectedStatus}
          />

          <div className="flex-1">

            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {documents.length === 0 ? (
              <UploadZone />
            ) : (
              <DocumentList
                documents={filteredDocuments}
                onDocumentSelect={(doc) =>{
                  if (doc.file && doc.file instanceof File) {
                      handleFileSelect(doc.file);
                      router.push('/builder');
                    } else {
                  
                      alert('No file found for this document.');
                    }
                  } }
              />
            )}
          </div>
        </div>
    </main>
  );
}

export default Dashboard;

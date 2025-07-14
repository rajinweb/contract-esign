'use client';
import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import DocumentList from '@/components/DocumentList';
import UploadZone from '@/components/UploadZone';
import DocumentEditor from '@/components/DocumentEditor';
import Sidebar from '@/components/Sidebar';
import {  Doc } from '@/types/types';
import useContextStore from '@/hooks/useContextStore';
import { useRouter } from 'next/navigation';

function Dashboard() {
  const { selectedFile, setSelectedFile, documents, setDocuments } =
    useContextStore();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router=useRouter();
  const { isLoggedIn } = useContextStore();
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'to_sign',
      createdAt: new Date(),
      signers: [],
    } as Doc;
    setDocuments([newDoc, ...documents]);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesStatus = !selectedStatus || doc.status === selectedStatus;
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const [prevSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    console.log('DropFile useEffect', { isLoggedIn, selectedFile });
    if ((!isLoggedIn && !selectedFile) || (prevSelectedFile !== null && selectedFile === null)) {
      router.push('/');
    }
  },[isLoggedIn, selectedFile, router])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {selectedFile ? ( <DocumentEditor/>) : (
        <div className="flex space-x-8">
          <Sidebar
            selectedStatus={selectedStatus}
            onStatusSelect={setSelectedStatus}
          />

          {/* Main content */}
          <div className="flex-1">
            {/* Search bar */}
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
              <UploadZone onFileSelect={handleFileSelect} />
            ) : (
              <DocumentList
                documents={filteredDocuments}
                onDocumentSelect={(doc) =>
                  console.log('Selected document:', doc)
                }
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;

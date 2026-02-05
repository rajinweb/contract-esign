'use client';
import { useState } from 'react';
import TrashDocumentList from '@/components/documents/TrashDocumentList';
import TrashTemplateList from '@/components/templates/TrashTemplateList';
import { Button } from '@/components/Button';
import useContextStore from '@/hooks/useContextStore';

const TrashPage = ({ searchQuery }: { searchQuery: string }) => {
  const [activeTab, setActiveTab] = useState('documents');
  const { documents, trashedTemplatesCount } = useContextStore();
  return (
    <div>
      <div className="flex border-b border-gray-300 gap-5 px-5 mt-10">
        <Button
          className={`relative !rounded-bl-none !rounded-br-none border-b-0 ${activeTab === 'documents' ?  'bg-gray-600 text-white' : 'text-gray-500'}`}
          onClick={() => setActiveTab('documents')}
          // label="Documents"
          {...(activeTab !== 'documents' && {inverted: true} )}
        >
          Documents
            <div className='bg-red-600 text-white  h-5 w-5  leading-5 rounded-full absolute -top-2 -right-2 text-xs'>
              {documents.filter(doc => doc.deletedAt).length}
              </div>
          </Button>
        <Button
          className={`relative !rounded-bl-none !rounded-br-none border-b-0 ${activeTab === 'templates' ? 'bg-gray-600 text-white' : 'text-gray-500'}`}
          onClick={() => setActiveTab('templates')}
          //label="Templates"
          {...(activeTab !== 'templates' && {inverted: true} )}
        >
          Templates
         <div className='bg-red-600 text-white  h-5 w-5  leading-5 rounded-full absolute -top-2 -right-2 text-xs'>{trashedTemplatesCount}</div>
          </Button>
      </div>
      <div className="p-4">
        {activeTab === 'documents' && <TrashDocumentList searchQuery={searchQuery} />}
        {activeTab === 'templates' && <TrashTemplateList searchQuery={searchQuery} />}
      </div>
    </div>
  );
};

export default TrashPage;

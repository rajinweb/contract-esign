'use client';
import TrashDocumentList from '@/components/documents/TrashDocumentList';
const TrashPage = ({ searchQuery }: { searchQuery: string }) => {
  return <TrashDocumentList searchQuery={searchQuery} />;
};

export default TrashPage;

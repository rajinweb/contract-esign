'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import UploadZone from '@/components/UploadZone';
import { PrimarySidebar, SecondarySidebar } from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SearchInput from '@/components/dashboard/DocSearch';
import Contacts from '@/components/contacts/Contacts';
import TemplateSearch from '@/components/templates/TemplateSearch';

import { useTemplates } from '@/hooks/useTemplates';
import useContextStore from '@/hooks/useContextStore';

import { Doc, SecondarySidebarType, SidebarType } from '@/types/types';
import { ACCOUNT_CONFIG } from '@/config/account.config';
import { DOCUMENT_CONFIG } from '@/config/document.config';

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const SIDEBAR_ROUTE_MAP: Array<{ match: string; sidebar: SidebarType }> = [
  { match: '/dashboard/my-account', sidebar: 'account' },
  { match: '/dashboard/contacts', sidebar: 'contacts' },
];

const accountViewMap: Record<string, React.ComponentType<any>> = ACCOUNT_CONFIG.reduce((acc, item) => {
    acc[item.id] = item.component;
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);

const documentViewMap: Record<string, React.ComponentType<any>> = {};

const registerDocumentViews = (items: readonly any[]) => {
  items.forEach(item => {
    if (item.component) {
      documentViewMap[item.id] = item.component;
    }
    if (item.children) {
      registerDocumentViews(item.children);
    }
  });
};

registerDocumentViews(DOCUMENT_CONFIG);
/* ------------------------------------------------------------------ */
/* component */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { documents, setDocuments, isLoggedIn } = useContextStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('documents');
  const [activeSecondarybar, setActiveSecondarybar] = useState<SecondarySidebarType>('dash-documents');

  const {
    templates,
    fetchTemplates,
  } = useTemplates();

  /* ------------------------------------------------------------------ */
  /* effects */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    localStorage.removeItem('currentDocumentId');
    localStorage.removeItem('currentSessionId');
  }, []);

  useEffect(() => {
    const match = SIDEBAR_ROUTE_MAP.find((r) =>
      pathname.startsWith(r.match)
    );
    const view = searchParams.get('view');
    const isAccountView = view === 'profile' || view === 'settings';
    if (match) {
      setActiveSidebar(match.sidebar);
    } else if (isAccountView) {
      setActiveSidebar('account');  
      setActiveSecondarybar((view as SecondarySidebarType) || 'profile');
    } else {
      setActiveSidebar('documents');
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (activeSidebar === 'account') {
      setActiveSecondarybar('profile');
    }
    if (activeSidebar === 'documents') {
      setActiveSecondarybar('dash-documents');
    }

  }, [activeSidebar]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const controller = new AbortController();

    const fetchDocs = async () => {
      try {
        const res = await fetch('/api/documents/list', {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('AccessToken') ?? ''}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch documents');

        const { success, documents = [] } = await res.json();
        if (!success || !Array.isArray(documents)) throw new Error('Invalid response');

        setDocuments(
          documents.map((doc: any): Doc => ({
            id: String(doc.id),
            documentId: String(doc.id),
            name: doc.name ?? doc.originalFileName ?? 'Untitled',
            folder: '',
            status: doc.status ?? 'saved',
            createdAt: new Date(doc.createdAt),
            file: undefined,
            url: `/api/documents/${doc.id}`,
            fileUrl: `/api/documents/${doc.id}`,
          }))
        );
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          console.error(e);
          setDocuments([]);
        }
      }
    };

    fetchDocs();

    return () => controller.abort();
  }, [isLoggedIn, setDocuments]);


  /* ------------------------------------------------------------------ */
  /* derived state */
  /* ------------------------------------------------------------------ */

  const showUploadZone =
    activeSidebar === 'documents' &&
    activeSecondarybar === 'dash-documents' &&
    documents.length === 0;

  const isTemplateView = activeSecondarybar === 'my-templates';

  /* ------------------------------------------------------------------ */
  /* render */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex flex-col w-[300px] border-r bg-white">
        <header className="flex items-center justify-between h-16 px-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              S
            </div>
            <div>
              <div className="text-sm font-medium">rajuxdesigns@gmail.com</div>
              <div className="text-xs text-slate-500">Personal Account</div>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </header>
        <main className="flex flex-1">
          <PrimarySidebar
            active={activeSidebar}
            setActive={setActiveSidebar}
          />
          <SecondarySidebar
            active={activeSidebar}
            activeSecondarybar={activeSecondarybar}
            secondaryActive={setActiveSecondarybar}
            templates={templates}
            fetchTemplates={fetchTemplates}
          />
        </main>
      </aside>

      {/* Content */}
      <section className="flex-1">
        <header className="flex items-center justify-end gap-4 px-6 h-16 border-b bg-white">
          {isTemplateView ? (
            <TemplateSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          ) : (
            <SearchInput
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder={
                activeSidebar === 'contacts'
                  ? 'Search contacts...'
                  : 'Search documents and forms'
              }
            />
          )}
          <DashboardHeader />
        </header>

        {showUploadZone ? (
          <UploadZone />
        ) : (
          <div className="p-4 h-[calc(100vh-65px)] overflow-auto bg-gray-100">
            {activeSidebar === 'documents' && (() => {
              const DocumentComponent = documentViewMap[activeSecondarybar];
              return DocumentComponent ? <DocumentComponent searchQuery={searchQuery} /> : null;
            })()}
            {activeSidebar === 'contacts' && <Contacts searchQuery={searchQuery} />}
            {activeSidebar === 'account' && (() => {
              const AccountComponent = accountViewMap[activeSecondarybar];
              return AccountComponent ? <AccountComponent /> : null;
            })()}
          </div>
        )}
      </section>
    </div>
  );
}

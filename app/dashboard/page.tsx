'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import UploadZone from '@/components/UploadZone';
import DashboardSidebarShell from '@/components/dashboard/DashboardSidebarShell';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SearchInput from '@/components/dashboard/DocSearch';
import Contacts from '@/components/contacts/Contacts';
import TemplateSearch from '@/components/templates/TemplateSearch';

import { useTemplates } from '@/hooks/useTemplates';
import useContextStore from '@/hooks/useContextStore';
import { useAuth } from '@/components/auth/AuthProvider';

import { Doc, SecondarySidebarType, SidebarType } from '@/types/types';
import { ACCOUNT_CONFIG, type AccountConfigItem } from '@/config/account.config';
import { DOCUMENT_CONFIG, type DocumentConfigItem } from '@/config/document.config';

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const SIDEBAR_ROUTE_MAP: Array<{ match: string; sidebar: SidebarType }> = [
  { match: '/account', sidebar: 'account' },
  { match: '/contacts', sidebar: 'contacts' },
];

type ViewComponent = React.ComponentType<Record<string, unknown>>;
type DocumentListItem = {
  id: string;
  originalFileName?: string;
  name?: string;
  status?: Doc['status'];
  createdAt: string | Date;
  deletedAt?: Date | null;
  statusBeforeDelete?: Doc['status'];
};

const accountViewMap: Record<string, ViewComponent> = ACCOUNT_CONFIG.reduce((acc, item: AccountConfigItem) => {
    acc[item.id] = item.component;
    return acc;
  }, {} as Record<string, ViewComponent>);

const documentViewMap: Record<string, ViewComponent> = {};

const registerDocumentViews = (items: readonly DocumentConfigItem[]) => {
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
  const { logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    documents,
    setDocuments,
    isLoggedIn,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory
  } = useContextStore();
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
          credentials: 'include',
        });

        if (res.status === 401) {
          setDocuments([]);
          await logout();
          window.location.replace('/login');
          return;
        }

        if (!res.ok) throw new Error('Failed to fetch documents');

        const { success, documents = [] } = await res.json();
        if (!success || !Array.isArray(documents)) throw new Error('Invalid response');

        setDocuments(
          documents.map((doc: DocumentListItem): Doc => ({
            id: String(doc.id),
            documentId: String(doc.id),
            name: doc.name ?? doc.originalFileName ?? 'Untitled',
            folder: '',
            status: doc.status ?? 'saved',
            createdAt: new Date(doc.createdAt),
            file: undefined,
            url: `/api/documents/${doc.id}`,
            fileUrl: `/api/documents/${doc.id}`,
            deletedAt: doc.deletedAt,
            statusBeforeDelete: doc.statusBeforeDelete
          }))
        );
      } catch (e) {
        if (!(e instanceof Error) || e.name !== 'AbortError') {
          console.error(e);
          setDocuments([]);
        }
      }
    };

    fetchDocs();

    return () => controller.abort();
  }, [isLoggedIn, logout, setDocuments]);


  /* ------------------------------------------------------------------ */
  /* derived state */
  /* ------------------------------------------------------------------ */
  const activeDocuments = documents.filter(doc => !doc.deletedAt);
  const showUploadZone =
    activeSidebar === 'documents' &&
    activeSecondarybar === 'dash-documents' &&
    activeDocuments.length === 0;

  const isTemplateView = activeSecondarybar === 'my-templates';

  /* ------------------------------------------------------------------ */
  /* render */
  /* ------------------------------------------------------------------ */

  return (
    <>
      {/* Sidebar */}
      <DashboardSidebarShell
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
        activeSecondarybar={activeSecondarybar}
        setActiveSecondarybar={setActiveSecondarybar}
        templates={templates}
        fetchTemplates={fetchTemplates}
      />
      <div className="w-full bg-gray-100">
        <header className='flex items-center justify-end  border-b gap-4 px-4 h-14 w-full bg-white'>
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
          <div className='overflow-auto p-4 h-[calc(100%-56px)]'>
            {activeSidebar === 'documents' && (() => {
              const DocumentComponent = documentViewMap[activeSecondarybar];
              return DocumentComponent ? <DocumentComponent searchQuery={searchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}/> : null;
            })()}
            {activeSidebar === 'contacts' && <Contacts searchQuery={searchQuery} />}
            {activeSidebar === 'account' && (() => {
              const AccountComponent = accountViewMap[activeSecondarybar];
              return AccountComponent ? <AccountComponent /> : null;
            })()}
          </div>
        )}
        </div>
    </>
  );
}

'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

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
  const { documents, setDocuments, isLoggedIn, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory} = useContextStore();
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
            deletedAt: doc.deletedAt
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
          <div className="flex items-center gap-0">            
           <svg xmlns="http://www.w3.org/2000/svg" className="-ml-3 mr-1.5" viewBox="0 0 64 64" width="32" height="32"><path fill="#2563eb" d="M11.954 2.2c2.722.038 5.566-.007 8.299-.008l16.264.003 6.895.004 2.048-.003c.414-.001.848-.015 1.256.022.382.035.696.25.963.513 1.024 1.01 2.042 2.034 3.058 3.053l5.593 5.596 2.739 2.74c.179.177.364.359.541.536.742.743 1.273 1.079 1.275 2.207.003 1.545-.004 3.091-.006 4.636l.002 8.707-.002 6.31c-.002 1.302.03 2.7-.064 3.986-.424 5.731-2.636 10.868-6.624 15.027a22.35 22.35 0 0 1-13.715 6.669c-1.568.154-2.86.12-4.423.117l-5.357-.002-5.192.026a455 455 0 0 0-10.966-.003c-.31.006-.654.003-.958.004-1.456.009-3.011.247-3.013-1.784-.001-.346.001-.762.001-1.116l.004-3.126.001-10.854q1.385-.008 2.77.005l-.004 14.094 15.561.003 6.166-.001c1.579-.001 3.409.051 4.956-.103a19.83 19.83 0 0 0 12.038-5.752 21.2 21.2 0 0 0 5.976-12.995c.16-1.845.064-4.032.063-5.918l.009-16.924c-.844-.046-2.114-.013-2.994-.015l-5.746-.004-1.887.009c-.709.004-1.437.114-1.98-.437a1.27 1.27 0 0 1-.35-.706c-.041-.295-.024-1.006-.024-1.326l.002-2.304-.001-8.155-31.83-.001c.035 1.704-.005 3.557-.006 5.278.943 1.103 2.009 2.213 2.987 3.296.848.938 1.802 2.011 2.696 2.888a23.2 23.2 0 0 0 8.069 5.239 22 22 0 0 0 2.212.707 20 20 0 0 0 1.377.319c.318.064.645.122.957.209.141.04.286.135.406.216.213.146.356.363.448.602.185.525.361 1.058.543 1.585l1.383 3.996 4.213 12.008 1.643 4.655c.284.826.899 1.931.277 2.715a1.4 1.4 0 0 1-.973.512c-.626.054-1.583-.404-2.18-.631l-2.014-.747-5.836-2.172-9.427-3.498-2.983-1.095c-.778-.285-2.197-.599-2.482-1.448-.118-.354-.194-.884-.269-1.265a23 23 0 0 0-.406-1.685 19.5 19.5 0 0 0-1.556-3.809 25.3 25.3 0 0 0-4.713-6.158c-.847-.807-1.86-1.635-2.756-2.405a338 338 0 0 0-3.539-3.014c.198-.278.555-.666.792-.936.317-.36.663-.776.993-1.117.527.374 1.513 1.252 2.037 1.704 1.079.932 2.42 1.974 3.433 2.947.628-.595 1.25-1.284 1.871-1.893 1.694-1.661 3.353-3.42 5.07-5.056-.454-.588-.977-1.146-1.476-1.698l-1.998-2.199c-.445-.486-.967-1.018-1.359-1.539-.211-.281-.16-1.265-.16-1.622l.001-2.131-.001-2.603c-.003-1.231-.262-2.686 1.382-2.885m-1.329 23.496c3.623 4.038 5.332 7.064 6.513 12.385l10.273 3.836a269 269 0 0 1 5.762 2.169c.365.143.779.276 1.126.42L28.06 38.25l-2.384-2.401c-.412-.414-.869-.891-1.294-1.285-.386.063-.577.052-.969.019-.377-.084-.628-.145-.955-.359-1.616-1.058-1.515-3.408.131-4.402a2.55 2.55 0 0 1 1.935-.278 2.6 2.6 0 0 1 1.591 1.194c.369.64.387 1.199.276 1.903.384.349.825.821 1.194 1.196l2.139 2.166a341 341 0 0 1 6.313 6.391c-.361-1.161-.87-2.459-1.281-3.624l-2.422-6.912-1.59-4.556-.426-1.231c-.076-.223-.161-.535-.253-.744-.719-.083-1.755-.399-2.457-.601-4.069-1.169-6.939-3.208-10.078-5.941-2.264 2.293-4.601 4.665-6.904 6.912m37.261-10.561 8.316-.001-5.719-5.725-1.665-1.673c-.273-.275-.657-.689-.943-.934l.002 5.288c.001 1.002-.015 2.046.009 3.045"/><path fill="#072e53" d="m60.517 29.48.055.051c.043.22.022 1.067.02 1.327l-.064-.081c-.029-.292-.013-1.04-.011-1.298"/><path fill="#143c60" d="M41.931 49.138c2.026.067 4.285.016 6.337.017l1.613.002c.411.001.983-.075 1.304.202a.98.98 0 0 1 .334.7c.021.617-.462.918-1.026.911-.692-.052-1.703-.021-2.42-.021l-4.282.002c-.629.002-1.252.014-1.888.009-.794-.007-1.204-.856-.713-1.474.196-.246.439-.317.741-.346"/></svg>
           <h1 className='text-2xl text-blue-600 font-semibold'>DocYouSign<sup className='text-sm'>TM</sup></h1>
          </div>
        
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
              return DocumentComponent ? <DocumentComponent searchQuery={searchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}/> : null;
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

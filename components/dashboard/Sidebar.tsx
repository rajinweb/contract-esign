import {
  Files,
  Contact,
  UserCog,
} from 'lucide-react';
import { Template } from '@/hooks/useTemplates';
import { SecondarySidebarType, SidebarType } from '@/types/types';
import { Button } from '../Button';

import AccountSidebar from '../builder/MyAccountNav';
import { AccountSection } from '@/config/account.config';
import DocumentsMenu from './DocumentMenu';
import ContactsSidebar from './ContactsSidebar';
export const PrimarySidebar = ({
  active,
  setActive,
}: {
  active: SidebarType;
  setActive: (s: SidebarType) => void;
}) => {
return (
    <div className="border-r flex flex-col gap-3 p-2">
      {/* Document  click */}
      <Button
        onClick={() => setActive('documents')}
        className={`relative group border-0 ${active === 'documents'
          ? '!bg-slate-100 '
          : 'text-slate-500 hover:text-slate-700'
          }`}
        title="Documents"
        icon={<Files className="w-5 h-5" />}
        inverted
      >
        <div className="absolute left-10 bottom-0 hidden group-hover:block p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 min-w-36">
          My Documents
        </div>
      </Button>
      {/* Contact  click */}
      <Button
        onClick={() => setActive('contacts')}
        className={`relative group border-0 ${active === 'contacts'
          ? '!bg-slate-100'
          : 'text-slate-500 hover:text-slate-700'
          }`}
        inverted
        title="Contacts"
        icon={<Contact className="w-5 h-5" />}>
        <div className="absolute left-10 bottom-0 hidden group-hover:block p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 min-w-24">
          My Contacts
        </div>
      </Button>
      <Button
        onClick={() => setActive('account')}
        className={`relative group border-0 ${active === 'account'
          ? '!bg-slate-100'
          : 'text-slate-500 hover:text-slate-700'
          }`}
        title="My Account"
        inverted
        icon={<UserCog className="w-5 h-5" />}>
        <div className="absolute left-10 bottom-0 hidden group-hover:block p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 min-w-24">
          My Account
        </div>
      </Button>

    </div>
)};

export const SecondarySidebar = ({
  active,
  activeSecondarybar,
  secondaryActive,
  templates,
  fetchTemplates,
}: {
  active: SidebarType,
  activeSecondarybar: SecondarySidebarType,
  secondaryActive: (s: SecondarySidebarType) => void;
  templates: Template[];
  fetchTemplates: (category?: string, search?: string) => Promise<void>;
}) => (
  <div className="w-64 p-5 h-full overflow-auto">
      {active === 'documents' &&
        <DocumentsMenu
          activeSecondarybar={activeSecondarybar as SecondarySidebarType}
          secondaryActive={secondaryActive}
          templates={templates}
          fetchTemplates={fetchTemplates}
        />
      }
      {active === 'contacts' && <ContactsSidebar />}
      {active === 'account' && <AccountSidebar
        active={activeSecondarybar as AccountSection}
        onChange={(e) => {
          secondaryActive(e as SecondarySidebarType);
        }}
      />}
  </div>
);

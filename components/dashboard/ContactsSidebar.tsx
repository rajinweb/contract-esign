import { useContactsStore } from "@/hooks/useContactsStore";
import useContextStore from "@/hooks/useContextStore";
import { ChevronDown, Plus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import BulkImportModal from "../contacts/BulkImportModal";

export default function ContactsSidebar() {
  const { contacts } = useContactsStore();
  const [open, setOpen] = useState(false);
  const { setShowModal } = useContextStore();
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleImportComplete = () => {
    setShowBulkImport(false);
    // Trigger contact revalidation through custom event
    window.dispatchEvent(new CustomEvent('contactsUpdated'));
  };
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Contacts</h2>
      {/* Create Contact Button with Dropdown */}
      <div className="relative">
        <div className="flex">
          <button
            onClick={() => setShowModal(true)}
            className="w-full primary-button rounded-tr-none rounded-br-none"
          >
            <span className='flex gap-1 justify-center'>
              <Plus/>
              Create Contact
            </span>
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="primary-button rounded-tl-none rounded-bl-none px-2.5  border border-r border-blue-800"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg">
            <button
              onClick={() => {
                setShowBulkImport(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <UserPlus className="w-4 h-4" />
              Import in Bulk
            </button>
          </div>
        )}
      </div>

      {/* Side Nav */}
      <nav className="mt-6 space-y-2 text-sm">
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-slate-100 text-slate-800"
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            All Contacts
          </span>
          <span className="text-slate-500">{contacts.length}</span>
        </button>
      </nav>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </>
  );
}
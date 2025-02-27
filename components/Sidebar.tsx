import React from 'react';
import { Filter } from 'lucide-react';

interface SidebarProps {
  selectedStatus: string | null;
  onStatusSelect: (status: string | null) => void;
}

export default function Sidebar({
  selectedStatus,
  onStatusSelect,
}: SidebarProps) {
  const statuses = [
    { id: 'shared', label: 'Shared' },
    { id: 'to_sign', label: 'To Sign' },
    { id: 'signed', label: 'Fully Signed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'expired', label: 'Expired' },
  ];

  return (
    <div className="w-64 bg-gray-50 p-4 border-r border-gray-200">
      <div className="flex items-center mb-4">
        <Filter className="w-5 h-5 text-gray-500 mr-2" />
        <h2 className="text-lg font-medium text-gray-900">State</h2>
      </div>
      <div className="space-y-2">
        {statuses.map((status) => (
          <label
            key={status.id}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedStatus === status.id}
              onChange={() =>
                onStatusSelect(selectedStatus === status.id ? null : status.id)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">{status.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { statuses } from "@/types/types"

type StatusDropdownProps = {
  selectedStatus: string | null;
  setSelectedStatus: (status: string | null) => void;
};

export default function StatusDropdown({
  selectedStatus,
  setSelectedStatus,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);

  // find the selected object based on selectedStatus prop
  const selected =
    statuses.find((s) => s.value === selectedStatus) || statuses[0];

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="border border-gray-300 bg-white rounded-md px-3 py-1 flex items-center justify-between w-52 text-sm"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${selected.dot}`}></span>
          <span>{selected.label}</span>
        </div>
        <ChevronDown strokeWidth={1} className={`w-4 h-4 ml-2 transition-transform ${
            open ? "rotate-180" : ""
          }`}/>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 shadow-lg rounded-md z-10">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500">
            FILTER BY STATUS
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {statuses.map((status) => (
              <li
                key={status.value ?? "all"}
                onClick={() => {
                  setSelectedStatus(status.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between cursor-pointer px-3 py-2 hover:bg-gray-50 ${
                  selected.value === status.value ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${status.dot}`}
                  ></span>
                  <span>{status.label}</span>
                </div>
                {selected.value === status.value && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

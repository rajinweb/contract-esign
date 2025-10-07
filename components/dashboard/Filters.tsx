"use client";
import { RefreshCcw, ArrowUpDown, List, Grid } from "lucide-react";
import StatusDropdown from "./StatusDropdown";

type FiltersProps = {
  selectedStatus: string | null;
  setSelectedStatus: (s: string | null) => void;
  selectedType: string;
  setSelectedType: (t: string) => void;
  selectedTime: string;
  setSelectedTime: (t: string) => void;
  selectedOwner: string;
  setSelectedOwner: (o: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  view: "list" | "grid";
  setView: (v: "list" | "grid") => void;
  toggleSelectAll:()=>void;
  selectedIds: string[];
  totalDocuments: number;
};

export default function Filters({
  selectedStatus,
  setSelectedStatus,
  selectedType,
  setSelectedType,
  selectedTime,
  setSelectedTime,
  selectedOwner,
  setSelectedOwner,
  sortBy,
  setSortBy,
  view,
  setView,
  toggleSelectAll,
  selectedIds,
  totalDocuments
}: FiltersProps) {
  const isAllSelected = selectedIds.length === totalDocuments;
  return (
    <div className="w-full flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm">
     
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="w-4 h-4 border-gray-300 rounded"
          aria-label="Select all"
          checked={isAllSelected}
          onChange={toggleSelectAll}
        />
     
        <StatusDropdown
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
        />

        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="docs">Docs</option>
          <option value="reports">Reports</option>
        </select>

        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={selectedOwner}
          onChange={(e) => setSelectedOwner(e.target.value)}
        >
          <option value="all">All Owners</option>
          <option value="me">Me</option>
          <option value="team">Team</option>
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded hover:bg-gray-100">
          <RefreshCcw className="w-4 h-4 text-gray-600" />
        </button>

        <button className="p-2 rounded hover:bg-gray-100">
          <ArrowUpDown className="w-4 h-4 text-gray-600" />
        </button>

        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="recent">Recent</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
        </select>

        <button
          onClick={() => setView(view === "list" ? "grid" : "list")}
          className="p-2 rounded hover:bg-gray-100"
        >
          {view === "list" ? (
            <Grid className="w-4 h-4 text-gray-600" />
          ) : (
            <List className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  );
}

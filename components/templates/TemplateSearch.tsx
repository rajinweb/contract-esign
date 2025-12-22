
import { Search } from 'lucide-react';
import React from 'react';

const CATEGORIES = ['HR', 'Legal', 'Sales', 'Finance', 'Other'];

interface TemplateSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

const TemplateSearch: React.FC<TemplateSearchProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}) => {
  return (
    <div className="flex gap-4 items-center mb-4">
      <div className="flex-1 min-w-[250px] relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <select
        value={selectedCategory || ''}
        onChange={(e) => setSelectedCategory(e.target.value || null)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Categories</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TemplateSearch;

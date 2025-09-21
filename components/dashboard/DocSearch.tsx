import { ChevronDown, Search } from "lucide-react";

type DocSearchProps = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  placeholder?:string
};

const SearchInput = ({ searchQuery, setSearchQuery, placeholder }: DocSearchProps) => {
  return (
    <div className="relative w-1/2">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        placeholder={placeholder || "Search..."}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        value={searchQuery}
        onChange={(e) => {
          console.log(searchQuery);
          setSearchQuery(e.target.value)
        }}
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
};

export default SearchInput;

'use client';

/**
 * SearchInput Component
 * 
 * Universal search input with type filters.
 */

import { Search, X } from 'lucide-react';
import { useState, useCallback } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, types: string[]) => void;
  placeholder?: string;
}

const ENTITY_TYPES = [
  { id: 'account', label: 'Accounts' },
  { id: 'contact', label: 'Contacts' },
  { id: 'quote', label: 'Quotes' },
  { id: 'order', label: 'Orders' },
  { id: 'production_job', label: 'Production Jobs' },
  { id: 'media_asset', label: 'Media Assets' },
];

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search across all entities...',
}: SearchInputProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const handleSearch = useCallback(() => {
    onSearch(value, selectedTypes);
  }, [value, selectedTypes, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const clearSearch = () => {
    onChange('');
    setSelectedTypes([]);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
        />
        {value && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        {ENTITY_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => toggleType(type.id)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedTypes.includes(type.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
      >
        Search
      </button>
    </div>
  );
}

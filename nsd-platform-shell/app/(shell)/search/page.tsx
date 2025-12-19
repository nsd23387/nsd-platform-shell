'use client';

/**
 * Universal Search Page
 * 
 * Read-only search across all entity types.
 * Uses nsd-shared-sdk search endpoints exclusively.
 */

import { useState, useCallback } from 'react';
import { SearchInput } from '@/components/SearchInput';
import { getMockSearchResults, SearchResult } from '@/lib/sdk';
import {
  Building2,
  User,
  FileText,
  Package,
  Factory,
  Image,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  account: Building2,
  contact: User,
  quote: FileText,
  order: Package,
  production_job: Factory,
  media_asset: Image,
};

const typeColors: Record<string, string> = {
  account: 'bg-blue-100 text-blue-600',
  contact: 'bg-purple-100 text-purple-600',
  quote: 'bg-green-100 text-green-600',
  order: 'bg-orange-100 text-orange-600',
  production_job: 'bg-red-100 text-red-600',
  media_asset: 'bg-pink-100 text-pink-600',
};

const typeLabels: Record<string, string> = {
  account: 'Account',
  contact: 'Contact',
  quote: 'Quote',
  order: 'Order',
  production_job: 'Production Job',
  media_asset: 'Media Asset',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback((searchQuery: string, types: string[]) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call
    setTimeout(() => {
      let searchResults = getMockSearchResults(searchQuery);
      
      // Filter by types if specified
      if (types.length > 0) {
        searchResults = searchResults.filter((r) => types.includes(r.type));
      }

      setResults(searchResults);
      setIsSearching(false);
    }, 300);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Universal Search</h1>
        <p className="text-gray-600 mt-1">
          Search across accounts, contacts, quotes, orders, and more.
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <SearchInput
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
        />
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hasSearched ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result) => (
                <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">No results found for &quot;{query}&quot;</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search terms or filters.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Enter a search term to get started</p>
          <p className="text-sm text-gray-400 mt-1">
            Search across all entities in the platform.
          </p>
        </div>
      )}

      {/* Read-only Notice */}
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          This search is <strong>read-only</strong>. Click a result to view details in its respective application.
        </p>
      </div>
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const Icon = typeIcons[result.type] || Package;
  const colorClass = typeColors[result.type] || 'bg-gray-100 text-gray-600';
  const typeLabel = typeLabels[result.type] || result.type;

  return (
    <Link
      href={result.url}
      className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {result.title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{result.subtitle}</p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0 mt-1" />
    </Link>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../services/api/search';
import { SearchResultsDropdown } from './SearchResultsDropdown';
import { useQuery } from '@tanstack/react-query';

export function GlobalSearchInput() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery, 5),
    enabled: debouncedQuery.length > 2,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (query.length > 2) {
      setIsOpen(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 2);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (type: string, id: string) => {
    setIsOpen(false);
    setQuery('');
    if (type === 'company') navigate(`/accounts/${id}`);
    else if (type === 'contact') navigate(`/contacts/${id}`);
    else if (type === 'deal') navigate(`/opportunities/${id}`);
    else if (type === 'lead') navigate(`/leads/${id}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Search companies, contacts, deals..."
          className="w-full rounded-md border border-white/10 bg-[#1A1A1C] px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isOpen && debouncedQuery.length > 2 && (
        <SearchResultsDropdown
          results={data?.results}
          isLoading={isLoading}
          onResultClick={handleResultClick}
        />
      )}
    </div>
  );
}


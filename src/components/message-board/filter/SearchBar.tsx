import { RefreshCw, Search } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

interface SearchBarProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchInput,
  setSearchInput,
  onSearchSubmit,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="flex gap-2">
      <form onSubmit={onSearchSubmit} className="relative flex-1">
        <Input
          type="search"
          placeholder="Search messages..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pr-10"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
      </form>

      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex-shrink-0"
        aria-label="Refresh messages"
      >
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>
    </div>
  );
};

export default SearchBar;

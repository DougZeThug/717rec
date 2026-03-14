import { ChevronRight, History } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

const LeagueHistoryBar: React.FC = () => {
  return (
    <Link
      to="/history"
      className={cn(
        'group relative block w-full',
        'bg-gradient-to-r from-blue-600 to-amber-500',
        'hover:from-blue-700 hover:to-amber-600',
        'transition-all duration-200',
        'rounded-xl shadow-md hover:shadow-lg',
        'overflow-hidden'
      )}
      style={{ minHeight: '56px', contain: 'layout style' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="relative flex items-center justify-center gap-3 px-6 py-4 text-white">
        <History className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
        <span className="font-semibold text-lg">League History</span>
        <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

export default LeagueHistoryBar;

import { ArrowRight } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import { TopPerformer } from '@/hooks/useLeagueInsights';
import { cn } from '@/lib/utils';

interface TopPerformersSectionProps {
  performers: TopPerformer[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Top Power Score': 'border-l-purple-500',
  'Best Win Rate': 'border-l-emerald-500',
  'Toughest Schedule': 'border-l-blue-500',
  'Longest Win Streak': 'border-l-amber-500',
  'Most Improved': 'border-l-green-500',
  'Biggest Drop': 'border-l-red-500',
};

const TopPerformersSection: React.FC<TopPerformersSectionProps> = ({ performers }) => {
  const navigate = useNavigate();

  if (performers.length === 0) return null;

  return (
    <div className="border rounded-lg bg-card shadow-sm p-4">
      <h3 className="font-bebas text-lg tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent mb-4">
        Top Performers
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {performers.map((performer) => (
          <button
            key={performer.category}
            onClick={() => navigate(`/teams/${performer.teamId}`)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border border-l-4 bg-muted/30',
              'hover:bg-muted/60 transition-colors text-left group',
              CATEGORY_COLORS[performer.category] || 'border-l-gray-500'
            )}
          >
            {performer.logoUrl && (
              <img
                src={performer.logoUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {performer.category}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">{performer.teamName}</p>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold font-mono text-foreground">
                  {performer.value}
                </span>
                <span className="text-xs text-muted-foreground">{performer.description}</span>
              </div>
            </div>
            <ArrowRight
              size={14}
              className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopPerformersSection;

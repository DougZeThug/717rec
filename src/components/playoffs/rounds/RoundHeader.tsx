
import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { blueAmber } from '@/styles/design-system';
import { roundAppearAnimation } from '../animation/BracketAnimationUtils';

interface RoundHeaderProps {
  round: string;
  type: string;
  roundIndex: number;
  matchCount: number;
}

const RoundHeader: React.FC<RoundHeaderProps> = ({
  round,
  type,
  roundIndex,
  matchCount
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  
  const getTypeColor = () => {
    switch (type) {
      case 'winners':
        return 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'losers':
        return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'finals':
        return 'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'play-in':
      case 'play-in-2':
        return 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300 border-gray-300 dark:border-gray-800';
    }
  };
  
  const getTypeLabel = () => {
    switch (type) {
      case 'winners': return 'Winners Bracket';
      case 'losers': return 'Losers Bracket';
      case 'finals': return 'Finals';
      case 'play-in': return 'Play-In';
      case 'play-in-2': return 'Play-In Round 2';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div 
      className={cn(
        "px-4 py-2 rounded-t-lg mb-4 text-center border-b-2",
        getTypeColor(),
        "opacity-0"
      )}
      style={{ 
        animation: roundAppearAnimation,
        animationDelay: `${roundIndex * 0.1}s`,
        animationFillMode: 'forwards'
      }}
    >
      <div className={cn(blueAmber.text.heading, "heading-winter")}>
        {type === 'finals' 
          ? `${getTypeLabel()}${parseInt(round) > 1 ? ' - Game ' + round : ''}`
          : `Round ${round}`
        }
      </div>
      <div className="text-xs opacity-70">{getTypeLabel()} · {matchCount} match{matchCount !== 1 ? 'es' : ''}</div>
    </div>
  );
};

export default RoundHeader;

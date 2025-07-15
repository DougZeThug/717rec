import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { BracketsManagerData, BracketViewerConfig } from '@/utils/brackets/types/ewanMellorTypes';

interface EwanMellorBracketViewerProps {
  data: BracketsManagerData;
  onMatchClick?: (matchId: number) => void;
  config?: BracketViewerConfig;
  className?: string;
}

const EwanMellorBracketViewer: React.FC<EwanMellorBracketViewerProps> = ({
  data,
  onMatchClick,
  config = {},
  className
}) => {
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Since @ewanmellor/brackets-viewer has packaging issues, 
    // we'll show a fallback message for now
    setError("@ewanmellor/brackets-viewer package has import issues. Using fallback display.");
  }, []);

  const handleMatchClick = (matchId: number) => {
    if (onMatchClick) {
      onMatchClick(matchId);
    }
  };

  if (error) {
    return (
      <div className={cn(
        'bracket-viewer-fallback',
        'w-full min-h-96 rounded-lg border bg-card p-8',
        className
      )}>
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {data.stage?.[0]?.name || 'Tournament Bracket'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {data.participant?.length || 0} participants • {data.match?.length || 0} matches
            </p>
          </div>
          
          {/* Simple fallback bracket display */}
          <div className="space-y-6">
            {data.match?.map((match, index) => {
              const participant1 = data.participant?.find(p => p.id === match.opponent1?.id);
              const participant2 = data.participant?.find(p => p.id === match.opponent2?.id);
              
              return (
                <div
                  key={match.id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleMatchClick(match.id)}
                >
                  <div className="text-xs text-muted-foreground mb-2">
                    Round {match.round_id || 1} - Match {match.number}
                  </div>
                  <div className="space-y-2">
                    <div className={cn(
                      "flex justify-between items-center p-2 rounded",
                      match.opponent1?.result === 'win' ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                    )}>
                      <span className="font-medium">
                        {participant1?.name || 'TBD'}
                      </span>
                      <span className="text-sm">
                        {match.opponent1?.score || '-'}
                      </span>
                    </div>
                    <div className={cn(
                      "flex justify-between items-center p-2 rounded",
                      match.opponent2?.result === 'win' ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                    )}>
                      <span className="font-medium">
                        {participant2?.name || 'TBD'}
                      </span>
                      <span className="text-sm">
                        {match.opponent2?.score || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EwanMellorBracketViewer;
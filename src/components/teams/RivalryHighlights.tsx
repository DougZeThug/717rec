import { Crown, ShieldAlert, Swords } from 'lucide-react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { TeamLogo } from '@/components/ui/team';
import { useHeadToHead } from '@/hooks/useHeadToHead';
import { cn } from '@/lib/utils';
import { classifyRivalries, type RivalryResults } from '@/utils/teamDetailsUtils/rivalryUtils';
import { toTeamSlug } from '@/utils/teamSlug';

interface RivalryHighlightsProps {
  teamId: string;
}

const RivalryHighlights: React.FC<RivalryHighlightsProps> = ({ teamId }) => {
  const { data: records, isLoading } = useHeadToHead(teamId);
  const navigate = useNavigate();

  const rivalries: RivalryResults = useMemo(() => {
    return classifyRivalries(records || []);
  }, [records]);

  const topRival = rivalries.closestRivalries[0] ?? null;
  const topDominated = rivalries.dominantMatchups[0] ?? null;
  const topNemesis = rivalries.nemeses[0] ?? null;

  // Don't render if nothing interesting to show
  const hasContent = topRival || topDominated || topNemesis;
  if (isLoading || !hasContent) return null;

  return (
    <CollapsibleSection
      title="Rivalry Highlights"
      icon={Swords}
      iconColor="text-rose-500"
      defaultOpen={false}
      headingId="rivalries-heading"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topRival && (
          <RivalryCard
            label="Top Rival"
            sublabel={`${topRival.wins}-${topRival.losses} all-time`}
            opponentName={topRival.opponent_name}
            opponentImageUrl={topRival.opponent_image_url}
            opponentId={topRival.opponent_id}
            icon={<Swords size={14} className="text-amber-500" />}
            borderColor="border-amber-500/30"
            bgColor="bg-amber-500/5"
            onClick={() => navigate(`/teams/${toTeamSlug(topRival.opponent_name)}`)}
          />
        )}
        {topDominated && (
          <RivalryCard
            label={topDominated.win_pct >= 83 ? 'Dominated' : 'Favorite'}
            sublabel={`${topDominated.wins}-${topDominated.losses} all-time`}
            opponentName={topDominated.opponent_name}
            opponentImageUrl={topDominated.opponent_image_url}
            opponentId={topDominated.opponent_id}
            icon={
              <Crown
                size={14}
                className={topDominated.win_pct >= 83 ? 'text-emerald-500' : 'text-teal-500'}
              />
            }
            borderColor={
              topDominated.win_pct >= 83 ? 'border-emerald-500/30' : 'border-teal-500/30'
            }
            bgColor={topDominated.win_pct >= 83 ? 'bg-emerald-500/5' : 'bg-teal-500/5'}
            onClick={() => navigate(`/teams/${toTeamSlug(topDominated.opponent_name)}`)}
          />
        )}
        {topNemesis && (
          <RivalryCard
            label={topNemesis.win_pct <= 18 ? 'Nemesis' : 'Tough Matchup'}
            sublabel={`${topNemesis.wins}-${topNemesis.losses} all-time`}
            opponentName={topNemesis.opponent_name}
            opponentImageUrl={topNemesis.opponent_image_url}
            opponentId={topNemesis.opponent_id}
            icon={
              <ShieldAlert
                size={14}
                className={topNemesis.win_pct <= 18 ? 'text-red-500' : 'text-orange-500'}
              />
            }
            borderColor={topNemesis.win_pct <= 18 ? 'border-red-500/30' : 'border-orange-500/30'}
            bgColor={topNemesis.win_pct <= 18 ? 'bg-red-500/5' : 'bg-orange-500/5'}
            onClick={() => navigate(`/teams/${toTeamSlug(topNemesis.opponent_name)}`)}
          />
        )}
      </div>
    </CollapsibleSection>
  );
};

interface RivalryCardProps {
  label: string;
  sublabel: string;
  opponentName: string;
  opponentImageUrl?: string;
  opponentId: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  onClick: () => void;
}

const RivalryCard: React.FC<RivalryCardProps> = ({
  label,
  sublabel,
  opponentName,
  opponentImageUrl,
  opponentId,
  icon,
  borderColor,
  bgColor,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left w-full',
      'hover:bg-muted/50',
      borderColor,
      bgColor
    )}
  >
    <TeamLogo
      imageUrl={opponentImageUrl || ''}
      teamName={opponentName}
      teamId={opponentId}
      size="sm"
    />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="font-medium text-sm truncate">{opponentName}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </div>
  </button>
);

export default React.memo(RivalryHighlights);

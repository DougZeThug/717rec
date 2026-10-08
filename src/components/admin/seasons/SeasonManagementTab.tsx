import { Calendar, Plus, Trophy } from 'lucide-react';
import React, { useState } from 'react';

import AdminSectionWrapper from '@/components/admin/AdminSectionWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSeasons } from '@/hooks/useSeasons';
import { Season } from '@/types/season';
import { toLocalDateString } from '@/utils/formatDateSafe';

import SeasonActions from './SeasonActions';
import SeasonForm from './SeasonForm';
import SeasonsList from './SeasonsList';

interface OverviewCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  caption: React.ReactNode;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, icon, value, caption }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {caption}
    </CardContent>
  </Card>
);

interface SeasonOverviewCardsProps {
  seasons: Season[] | undefined;
  activeSeason: Season | undefined;
}

const SeasonOverviewCards: React.FC<SeasonOverviewCardsProps> = ({ seasons, activeSeason }) => {
  const archivedSeasons = seasons?.filter((season) => season.is_archived);
  const inactiveSeasons = seasons?.filter((season) => !season.is_active && !season.is_archived);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <OverviewCard
        title="Active Season"
        icon={<Calendar className="size-4 text-muted-foreground" />}
        value={activeSeason ? activeSeason.name : 'None'}
        caption={
          activeSeason && (
            <p className="text-xs text-muted-foreground">
              Started {toLocalDateString(activeSeason.start_date)}
            </p>
          )
        }
      />

      <OverviewCard
        title="Total Seasons"
        icon={<Trophy className="size-4 text-muted-foreground" />}
        value={seasons?.length || 0}
        caption={
          <p className="text-xs text-muted-foreground">{archivedSeasons?.length || 0} archived</p>
        }
      />

      <OverviewCard
        title="Inactive Seasons"
        icon={<Calendar className="size-4 text-muted-foreground" />}
        value={inactiveSeasons?.length || 0}
        caption={<p className="text-xs text-muted-foreground">Ready to activate</p>}
      />
    </div>
  );
};

interface SeasonActionBarProps {
  activeSeason: Season | undefined;
  onCreate: () => void;
}

const SeasonActionBar: React.FC<SeasonActionBarProps> = ({ activeSeason, onCreate }) => (
  <div className="flex justify-between items-center">
    <Button onClick={onCreate} className="flex items-center gap-2">
      <Plus className="size-4" />
      Create New Season
    </Button>
    {activeSeason && <SeasonActions season={activeSeason} />}
  </div>
);

const SeasonManagementTab = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const { data: seasons, isLoading } = useSeasons();

  const activeSeason = seasons?.find((season) => season.is_active);

  const handleCreateSeason = () => {
    setEditingSeason(null);
    setShowCreateForm(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingSeason(null);
  };

  return (
    <AdminSectionWrapper title="Season Management" icon={Calendar}>
      <div className="space-y-6">
        {/* Season Overview Cards */}
        <SeasonOverviewCards seasons={seasons} activeSeason={activeSeason} />

        {/* Action Buttons */}
        <SeasonActionBar activeSeason={activeSeason} onCreate={handleCreateSeason} />

        {/* Season Form */}
        {showCreateForm && (
          <SeasonForm season={editingSeason ?? undefined} onClose={handleCloseForm} />
        )}

        {/* Seasons List */}
        <SeasonsList seasons={seasons} isLoading={isLoading} onEditSeason={handleEditSeason} />
      </div>
    </AdminSectionWrapper>
  );
};

export default SeasonManagementTab;

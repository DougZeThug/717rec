import { Calendar, Plus, Trophy } from 'lucide-react';
import React, { useState } from 'react';

import AdminSectionWrapper from '@/components/admin/AdminSectionWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSeasons } from '@/hooks/useSeasons';

import SeasonActions from './SeasonActions';
import SeasonForm from './SeasonForm';
import SeasonsList from './SeasonsList';

const SeasonManagementTab = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const { data: seasons, isLoading } = useSeasons();

  const activeSeason = seasons?.find((season) => season.is_active);
  const archivedSeasons = seasons?.filter((season) => season.is_archived);
  const inactiveSeasons = seasons?.filter((season) => !season.is_active && !season.is_archived);

  const handleCreateSeason = () => {
    setEditingSeason(null);
    setShowCreateForm(true);
  };

  const handleEditSeason = (season: any) => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Season</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSeason ? activeSeason.name : 'None'}</div>
              {activeSeason && (
                <p className="text-xs text-muted-foreground">
                  Started {new Date(activeSeason.start_date).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Seasons</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seasons?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {archivedSeasons?.length || 0} archived
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Seasons</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inactiveSeasons?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Ready to activate</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button onClick={handleCreateSeason} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Season
          </Button>
          {activeSeason && <SeasonActions season={activeSeason} />}
        </div>

        {/* Season Form */}
        {showCreateForm && <SeasonForm season={editingSeason} onClose={handleCloseForm} />}

        {/* Seasons List */}
        <SeasonsList seasons={seasons} isLoading={isLoading} onEditSeason={handleEditSeason} />
      </div>
    </AdminSectionWrapper>
  );
};

export default SeasonManagementTab;

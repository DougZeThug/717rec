
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, TrendingUp, Trophy, Calendar } from 'lucide-react';
import { useLatestWeeklyDigest, useWeeklyHeatRankings } from '@/hooks/weekly';
import WeeklyHeatRankingsTable from './WeeklyHeatRankingsTable';
import WeeklyHighlights from './WeeklyHighlights';
import WeeklyOverview from './WeeklyOverview';
import WeekSelector from './WeekSelector';

const WeeklyHeatIndex = () => {
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  
  const { data: latestDigest, isLoading: isLoadingDigest } = useLatestWeeklyDigest();
  const { data: heatRankings, isLoading: isLoadingRankings } = useWeeklyHeatRankings(selectedWeek);

  // Use latest week if no week selected
  const currentWeek = selectedWeek || latestDigest?.week_of;
  const currentDigest = selectedWeek ? undefined : latestDigest;

  if (isLoadingDigest && !selectedWeek) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Weekly Heat Index</h1>
            <p className="text-muted-foreground">Loading weekly performance data...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Weekly Heat Index</h1>
            <p className="text-muted-foreground">
              Track team momentum and performance week by week
            </p>
          </div>
        </div>
        <WeekSelector 
          selectedWeek={currentWeek}
          onWeekChange={setSelectedWeek}
        />
      </div>

      {/* Overview Section */}
      {currentDigest && (
        <WeeklyOverview digest={currentDigest} />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="rankings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rankings" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Heat Rankings
          </TabsTrigger>
          <TabsTrigger value="highlights" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Weekly Highlights
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Historical Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-6">
          <WeeklyHeatRankingsTable 
            rankings={heatRankings || []} 
            isLoading={isLoadingRankings}
            weekOf={currentWeek}
          />
        </TabsContent>

        <TabsContent value="highlights" className="space-y-6">
          <WeeklyHighlights 
            weekOf={currentWeek}
            digest={currentDigest}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Heat Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Historical heat index data and trends will be implemented in Phase 3.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WeeklyHeatIndex;

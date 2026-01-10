import React from 'react';

import EditScoresSection from '@/components/admin/EditScoresSection';
import PendingMatchesSection from '@/components/admin/PendingMatchesSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ScoresTab = () => {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <EditScoresSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approve Results</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingMatchesSection />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoresTab;

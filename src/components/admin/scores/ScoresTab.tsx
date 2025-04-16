
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import EditScoresSection from "@/components/admin/EditScoresSection";
import PendingMatchesSection from "@/components/admin/PendingMatchesSection";

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

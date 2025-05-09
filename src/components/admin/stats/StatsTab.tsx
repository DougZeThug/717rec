
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import AdminSectionWrapper from "@/components/admin/AdminSectionWrapper";
import SeasonStatsTab from "@/components/admin/stats/SeasonStatsTab";
import { LineChart } from "lucide-react";

const StatsTab = () => {
  return (
    <AdminSectionWrapper title="Stats Management" icon={LineChart}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Season Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <SeasonStatsTab />
          </CardContent>
        </Card>
      </div>
    </AdminSectionWrapper>
  );
};

export default StatsTab;

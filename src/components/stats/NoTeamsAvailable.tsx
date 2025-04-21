
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const NoTeamsAvailable = () => (
  <Card>
    <CardHeader>
      <CardTitle>No Teams Available</CardTitle>
      <CardDescription>There are no teams in the selected division or no teams have been added yet.</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Try selecting a different division or add teams to view statistics.</p>
    </CardContent>
  </Card>
);

export default NoTeamsAvailable;

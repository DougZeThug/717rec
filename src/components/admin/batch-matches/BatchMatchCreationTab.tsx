
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import BatchMatchForm from "./BatchMatchForm";

const BatchMatchCreationTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Match Creation</CardTitle>
      </CardHeader>
      <CardContent>
        <BatchMatchForm />
      </CardContent>
    </Card>
  );
};

export default BatchMatchCreationTab;

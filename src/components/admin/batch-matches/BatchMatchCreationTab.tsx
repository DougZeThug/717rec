
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import BatchMatchForm from "./BatchMatchForm";
import AdminSectionWrapper from "../AdminSectionWrapper";
import { Calendar } from "lucide-react";

const BatchMatchCreationTab = () => {
  return (
    <AdminSectionWrapper 
      title="Batch Match Creation" 
      icon={Calendar}
    >
      <Card className="rounded-xl shadow-md">
        <CardHeader>
          <CardTitle>Create Multiple Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchMatchForm />
        </CardContent>
      </Card>
    </AdminSectionWrapper>
  );
};

export default BatchMatchCreationTab;

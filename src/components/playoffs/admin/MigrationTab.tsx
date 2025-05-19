
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BracketMigrationPanel from "./BracketMigrationPanel";

const MigrationTab: React.FC = () => {
  const [showMigrationTool, setShowMigrationTool] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Bracket Migration</h2>
      </div>
      
      {!showMigrationTool ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This section allows you to migrate existing brackets to the new bracket management system.
                  The migration process preserves all existing bracket data and structures.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-medium">Before You Begin</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>All existing bracket data will be preserved</li>
                  <li>Brackets will continue to display correctly during and after migration</li>
                  <li>You can migrate brackets one at a time or all at once</li>
                  <li>If needed, migrations can be rolled back</li>
                </ul>
              </div>
              
              <div className="pt-4">
                <Button onClick={() => setShowMigrationTool(true)}>
                  Open Migration Tool
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <BracketMigrationPanel onComplete={() => setShowMigrationTool(false)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MigrationTab;
